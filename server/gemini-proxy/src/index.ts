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
const GENERATE_CONTENT_PATH = /^\/v1beta\/models\/[\w.-]+:generateContent$/;
const RATE_LIMIT_PER_HOUR = 30;

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

async function isWithinRateLimit(kv: KVNamespace, clientId: string): Promise<boolean> {
  const hourBucket = new Date().toISOString().slice(0, 13); // "YYYY-MM-DDTHH"
  const key = `rl:${clientId}:${hourBucket}`;
  const current = Number((await kv.get(key)) ?? '0');
  if (current >= RATE_LIMIT_PER_HOUR) return false;
  await kv.put(key, String(current + 1), { expirationTtl: 3600 });
  return true;
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
    if (!GENERATE_CONTENT_PATH.test(url.pathname)) {
      return new Response('Not Found', { status: 404 });
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

    const upstream = await fetch(`${GEMINI_ORIGIN}${url.pathname}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': env.GEMINI_API_KEY,
      },
      body: request.body,
    });

    return new Response(upstream.body, {
      status: upstream.status,
      headers: { 'Content-Type': upstream.headers.get('Content-Type') ?? 'application/json' },
    });
  },
};
