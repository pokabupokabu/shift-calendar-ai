/**
 * Thin transparent proxy in front of the Gemini API (see shift-calendar-ai
 * README "8. 不明点・リスク" 1): the real Gemini API key lives only in this
 * Worker's secrets, never in the app bundle. The app sends the same request
 * shape it used to send straight to Google, just to this Worker's URL with a
 * shared-secret header instead of the real key.
 *
 * This does not fully stop abuse by someone who extracts the shared secret
 * from the app bundle (it's still client-embedded) — it bounds the blast
 * radius to our own rate limit instead of unlimited direct Gemini usage, and
 * lets us revoke/rotate the secret independently of the Gemini key.
 */

export interface Env {
  GEMINI_API_KEY: string;
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
    // Only relay Gemini's own generateContent path shape — this must never
    // become an open relay to arbitrary Google APIs.
    const pathMatch = GENERATE_CONTENT_PATH.exec(url.pathname);
    if (!pathMatch || !ALLOWED_MODELS.has(pathMatch[1])) {
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

    const imageCount = countInlineImages(parsedBody);
    if (imageCount < 0) {
      return new Response('Bad Request', { status: 400 });
    }
    if (imageCount > MAX_IMAGES_PER_REQUEST) {
      return new Response('Payload Too Large', { status: 413 });
    }

    const upstream = await fetch(`${GEMINI_ORIGIN}${url.pathname}`, {
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
