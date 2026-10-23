/**
 * Thin transparent proxy in front of the AI APIs (see shift-calendar-ai
 * README "8. 不明点・リスク" 1): the real API keys live only in this Worker's
 * secrets, never in the app bundle. The app sends the same request shape it
 * would send straight to the provider, just to this Worker's URL with a
 * shared-secret header instead of the real key.
 *
 * Routes:
 * - POST /v1/messages → Anthropic Messages API（今の本命。モデルは本文の model で指定）
 * - POST /v1beta/models/<model>:generateContent → Gemini（切り替えが済んだら閉じる）
 *
 * 合言葉・回数制限（KVの数え方）・本文の大きさ・画像の枚数の決まりは両方の道で共通。
 *
 * This does not fully stop abuse by someone who extracts the shared secret
 * from the app bundle (it's still client-embedded) — it bounds the blast
 * radius to our own rate limit instead of unlimited direct Gemini usage, and
 * lets us revoke/rotate the secret independently of the Gemini key.
 */

export interface Env {
  GEMINI_API_KEY: string;
  /** Anthropic の APIキー。`wrangler secret put ANTHROPIC_API_KEY` で設定する（アプリには入れない）。 */
  ANTHROPIC_API_KEY: string;
  APP_SHARED_SECRET: string;
  /**
   * Salt used only for hashing the rate-limit key.
   *
   * APP_SHARED_SECRET cannot be reused here: it ships inside the app's JS bundle as
   * EXPO_PUBLIC_AI_PROXY_SECRET, so anyone who extracts it could brute-force the whole
   * IPv4 space (~4.3 billion) against the stored hashes and recover the original IPs.
   * Set this with `wrangler secret put RATE_LIMIT_SALT` before deploying.
   */
  RATE_LIMIT_SALT: string;
  RATE_LIMIT_KV: KVNamespace;
}

const GEMINI_ORIGIN = 'https://generativelanguage.googleapis.com';
const GENERATE_CONTENT_PATH = /^\/v1beta\/models\/([\w.-]+):generateContent$/;
const ANTHROPIC_MESSAGES_URL = 'https://api.anthropic.com/v1/messages';
const ANTHROPIC_MESSAGES_PATH = '/v1/messages';
const ANTHROPIC_VERSION = '2023-06-01';
const RATE_LIMIT_PER_HOUR = 30;
/**
 * 短時間の連打を粗く弾くための上限。1時間の上限だけだと、30回を一瞬で使い切る
 * 使われ方を止められない。KVは結果整合なので正確な計数にはならないが、
 * ここで求めているのは正確さではなく「桁を抑える」ことなので十分。
 */
const RATE_LIMIT_PER_MINUTE = 5;

/**
 * このWorkerが中継してよいモデル。
 *
 * モデル名はクライアントが送ってくるため、ここで固定しないと、合言葉を抜いた相手が
 * 任意の（高価な）モデルを指定できてしまう。無料ユーザーがPRO用モデルを指定する
 * 経路も同時に塞がる。モデルを切り替えるときはアプリ側の既定値（src/config/env.ts）と
 * ここの両方を更新してデプロイすること。
 */
const ALLOWED_MODELS = new Set(['gemini-3.1-flash-lite', 'gemini-3.8-flash']);

/**
 * Anthropic の道で中継してよいモデル（ふだんの解析と、PROの高度なスキャン）。理由は ALLOWED_MODELS と同じ。
 * アプリ側の既定値（src/config/env.ts の modelStandard / modelAdvanced）と必ず揃えること。
 */
const ANTHROPIC_ALLOWED_MODELS = new Set(['claude-haiku-5-5', 'claude-sonnet-5-5']);

/**
 * Anthropic の応答の長さの上限。アプリは16,000で送っている。これより大きい値を許すと、
 * 合言葉を抜いた相手が1回の呼び出しを桁違いに高くできてしまう。
 */
const ANTHROPIC_MAX_OUTPUT_TOKENS = 16000;

/** 1リクエストに詰め込める画像の枚数。アプリ側（photo-select）でも同じ値で制限している。 */
const MAX_IMAGES_PER_REQUEST = 4;

/**
 * リクエスト全体の上限。画像は長辺2000pxへ縮小後のJPEGをbase64で送るため、
 * 4枚でも実測で数MBに収まる。桁違いの本文を弾いて、課金とメモリの両方を守る。
 */
const MAX_REQUEST_BYTES = 12 * 1024 * 1024;

/**
 * Turns a client IP into a key that cannot be traced back to the IP.
 *
 * Using the raw IP as the KV key meant a personally identifiable value sat in storage for
 * the key's full hour. A salted SHA-256 keeps rate limiting exactly as accurate — the same
 * IP always maps to the same value — while leaving nothing identifying behind.
 */
async function clientFingerprint(ip: string, salt: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(`${salt}:${ip}`));
  return [...new Uint8Array(digest)]
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('')
    .slice(0, 32);
}

async function consumeQuota(
  kv: KVNamespace,
  key: string,
  limit: number,
  ttlSeconds: number,
): Promise<boolean> {
  const current = Number((await kv.get(key)) ?? '0');
  if (current >= limit) return false;
  await kv.put(key, String(current + 1), { expirationTtl: ttlSeconds });
  return true;
}

async function isWithinRateLimit(kv: KVNamespace, clientId: string): Promise<boolean> {
  const now = new Date().toISOString();
  const hourBucket = now.slice(0, 13); // "YYYY-MM-DDTHH"
  const minuteBucket = now.slice(0, 16); // "YYYY-MM-DDTHH:mm"

  // 分の上限を先に見る。連打されたときに時間枠を使い切らせないため。
  if (!(await consumeQuota(kv, `rlm:${clientId}:${minuteBucket}`, RATE_LIMIT_PER_MINUTE, 120))) {
    return false;
  }

  return consumeQuota(kv, `rl:${clientId}:${hourBucket}`, RATE_LIMIT_PER_HOUR, 3600);
}

/**
 * 本文に含まれる画像（inlineData）の枚数を数える。
 * 形が想定と違う場合は -1 を返し、呼び出し側で400にする。
 */
function countInlineImages(body: unknown): number {
  if (typeof body !== 'object' || body === null) return -1;
  const contents = (body as { contents?: unknown }).contents;
  if (!Array.isArray(contents)) return -1;

  let count = 0;
  for (const content of contents) {
    const parts = (content as { parts?: unknown })?.parts;
    if (!Array.isArray(parts)) continue;
    for (const part of parts) {
      if (part && typeof part === 'object' && 'inlineData' in part) count += 1;
    }
  }
  return count;
}

/**
 * Anthropic の本文に含まれる画像ブロック（type: "image"）の枚数を数える。
 * messages が配列でないなど形が想定と違う場合は -1 を返し、呼び出し側で400にする。
 */
function countAnthropicImages(body: Record<string, unknown>): number {
  const messages = body.messages;
  if (!Array.isArray(messages)) return -1;

  let count = 0;
  for (const message of messages) {
    const content = (message as { content?: unknown })?.content;
    if (typeof content === 'string') continue;
    if (!Array.isArray(content)) return -1;
    for (const block of content) {
      if (block && typeof block === 'object' && (block as { type?: unknown }).type === 'image') {
        count += 1;
      }
    }
  }
  return count;
}

type Route = { kind: 'gemini'; path: string } | { kind: 'anthropic' };

/** パスから道を決める。どちらにも当てはまらなければ null（404）。 */
function matchRoute(pathname: string): Route | null {
  if (pathname === ANTHROPIC_MESSAGES_PATH) return { kind: 'anthropic' };
  // Only relay Gemini's own generateContent path shape — this must never
  // become an open relay to arbitrary Google APIs.
  const pathMatch = GENERATE_CONTENT_PATH.exec(pathname);
  if (pathMatch && ALLOWED_MODELS.has(pathMatch[1])) return { kind: 'gemini', path: pathname };
  return null;
}

/** 本文を検証してから Anthropic へ送る。中継するのは本文だけで、アプリのヘッダーは1つも渡さない。 */
async function relayToAnthropic(parsedBody: unknown, rawBody: string, env: Env): Promise<Response> {
  if (typeof parsedBody !== 'object' || parsedBody === null || Array.isArray(parsedBody)) {
    return new Response('Bad Request', { status: 400 });
  }
  const body = parsedBody as Record<string, unknown>;

  if (typeof body.model !== 'string') {
    return new Response('Bad Request', { status: 400 });
  }
  if (!ANTHROPIC_ALLOWED_MODELS.has(body.model)) {
    return new Response('Not Found', { status: 404 });
  }
  if (
    typeof body.max_tokens !== 'number' ||
    !Number.isFinite(body.max_tokens) ||
    body.max_tokens > ANTHROPIC_MAX_OUTPUT_TOKENS
  ) {
    return new Response('Bad Request', { status: 400 });
  }

  const imageCount = countAnthropicImages(body);
  if (imageCount < 0) {
    return new Response('Bad Request', { status: 400 });
  }
  if (imageCount > MAX_IMAGES_PER_REQUEST) {
    return new Response('Payload Too Large', { status: 413 });
  }

  if (!env.ANTHROPIC_API_KEY) {
    return new Response('Service Unavailable', { status: 503 });
  }

  const upstream = await fetch(ANTHROPIC_MESSAGES_URL, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': env.ANTHROPIC_API_KEY,
      'anthropic-version': ANTHROPIC_VERSION,
    },
    body: rawBody,
  });

  return new Response(upstream.body, {
    status: upstream.status,
    headers: { 'Content-Type': upstream.headers.get('Content-Type') ?? 'application/json' },
  });
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    if (request.method !== 'POST') {
      return new Response('Method Not Allowed', { status: 405 });
    }

    const sharedSecret = request.headers.get('x-app-secret');
    if (!sharedSecret || sharedSecret !== env.APP_SHARED_SECRET) {
      return new Response('Unauthorized', { status: 401 });
    }

    const url = new URL(request.url);
    const route = matchRoute(url.pathname);
    if (!route) {
      return new Response('Not Found', { status: 404 });
    }

    // 本文を読む前に、宣言されたサイズで明らかに大きすぎるものを落とす。
    const declaredLength = Number(request.headers.get('content-length') ?? '0');
    if (declaredLength > MAX_REQUEST_BYTES) {
      return new Response('Payload Too Large', { status: 413 });
    }

    // Fail closed rather than silently falling back to a guessable salt: without it the
    // stored hashes would be reversible, which is the whole point of hashing here.
    if (!env.RATE_LIMIT_SALT) {
      return new Response('Service Unavailable', { status: 503 });
    }

    const clientIp = request.headers.get('cf-connecting-ip') ?? 'unknown';
    const clientId = await clientFingerprint(clientIp, env.RATE_LIMIT_SALT);
    if (!(await isWithinRateLimit(env.RATE_LIMIT_KV, clientId))) {
      return new Response('Too Many Requests', { status: 429 });
    }

    // Content-Length は詐称できるため、実際に読んだ長さでも確認する。
    const rawBody = await request.text();
    if (new TextEncoder().encode(rawBody).length > MAX_REQUEST_BYTES) {
      return new Response('Payload Too Large', { status: 413 });
    }

    let parsedBody: unknown;
    try {
      parsedBody = JSON.parse(rawBody);
    } catch {
      return new Response('Bad Request', { status: 400 });
    }

    if (route.kind === 'anthropic') {
      return relayToAnthropic(parsedBody, rawBody, env);
    }

    const imageCount = countInlineImages(parsedBody);
    if (imageCount < 0) {
      return new Response('Bad Request', { status: 400 });
    }
    if (imageCount > MAX_IMAGES_PER_REQUEST) {
      return new Response('Payload Too Large', { status: 413 });
    }

    const upstream = await fetch(`${GEMINI_ORIGIN}${route.path}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': env.GEMINI_API_KEY,
      },
      body: rawBody,
    });

    return new Response(upstream.body, {
      status: upstream.status,
      headers: { 'Content-Type': upstream.headers.get('Content-Type') ?? 'application/json' },
    });
  },
};
