// Allerion API — routing, auth, CORS and rate limiting.
//
// Runtime-portable: the handler takes (Request, env) and returns a Response, so
// the same code runs on Cloudflare Workers and on plain Node. Nothing here uses
// a runtime-specific global beyond fetch/Request/Response/crypto.

import { json } from './openai.js';
import { handleSearch } from './handlers/search.js';
import { handleAnalyst } from './handlers/analyst.js';

const VERSION = '1.0.0';

/* ── CORS ─────────────────────────────────────────────────────────────
 * An Origin allowlist is not authentication — a browser enforces it, curl
 * does not. It exists so the war board can call the API from a browser at
 * all; the API key is what actually protects the endpoint. Put Cloudflare
 * Access in front of any origin you allow here. */
function corsHeaders(request, env) {
  const origin = request.headers.get('origin');
  const allowed = (env.ALLOWED_ORIGINS || '').split(',').map((s) => s.trim()).filter(Boolean);
  if (!origin || !allowed.includes(origin)) return {};
  return {
    'access-control-allow-origin': origin,
    'access-control-allow-methods': 'POST, GET, OPTIONS',
    'access-control-allow-headers': 'content-type, authorization',
    'access-control-max-age': '86400',
    vary: 'Origin',
  };
}

/* ── Auth ─────────────────────────────────────────────────────────────
 * Bearer keys from env, compared in constant time so a timing signal cannot
 * be used to recover a key byte by byte. */
function timingSafeEqual(a, b) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

function authorize(request, env) {
  const configured = (env.API_KEYS || '').split(',').map((s) => s.trim()).filter(Boolean);
  if (!configured.length) {
    return { ok: false, response: json({
      error: 'server_unconfigured',
      message: 'API_KEYS is not set on this deployment, so every request is refused.',
    }, 503) };
  }
  const header = request.headers.get('authorization') || '';
  const token = header.startsWith('Bearer ') ? header.slice(7).trim() : '';
  if (!token || !configured.some((k) => timingSafeEqual(k, token))) {
    return { ok: false, response: json({
      error: 'unauthorized',
      message: 'Provide a valid key as: Authorization: Bearer <key>',
    }, 401) };
  }
  return { ok: true, token };
}

/* ── Rate limiting ────────────────────────────────────────────────────
 * Fixed window, per key, in memory. On Workers this is per-isolate and on
 * Node per-process, so it is a guardrail against runaway cost — not a
 * distributed quota. Move to KV or Durable Objects if that matters. */
const buckets = new Map();

function rateLimit(token, env) {
  const limit = Number(env.RATE_LIMIT_PER_MINUTE || 20);
  if (!Number.isFinite(limit) || limit <= 0) return null;
  const now = Date.now();
  const windowStart = now - (now % 60_000);
  const key = `${token}:${windowStart}`;
  const used = (buckets.get(key) || 0) + 1;
  buckets.set(key, used);
  if (buckets.size > 5000) {
    for (const k of buckets.keys()) {
      if (!k.endsWith(String(windowStart))) buckets.delete(k);
    }
  }
  if (used > limit) {
    const retry = Math.ceil((windowStart + 60_000 - now) / 1000);
    return json({
      error: 'rate_limited',
      message: `Over ${limit} requests/minute for this key.`,
    }, 429, { 'retry-after': String(retry) });
  }
  return null;
}

const ROUTES = {
  'POST /v1/search': handleSearch,
  'POST /v1/analyst': handleAnalyst,
};

export async function route(request, env) {
  const url = new URL(request.url);
  const cors = corsHeaders(request, env);

  if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });

  const withCors = (res) => {
    for (const [k, v] of Object.entries(cors)) res.headers.set(k, v);
    return res;
  };

  // Unauthenticated: liveness only. Reveals nothing about configuration.
  if (url.pathname === '/v1/health' && request.method === 'GET') {
    return withCors(json({ status: 'ok', version: VERSION }));
  }

  const key = `${request.method} ${url.pathname}`;
  const handler = ROUTES[key];
  if (!handler) {
    return withCors(json({
      error: 'not_found',
      message: `No route for ${key}.`,
      routes: ['GET /v1/health', ...Object.keys(ROUTES)],
    }, 404));
  }

  const auth = authorize(request, env);
  if (!auth.ok) return withCors(auth.response);

  const limited = rateLimit(auth.token, env);
  if (limited) return withCors(limited);

  try {
    return withCors(await handler(request, env));
  } catch (err) {
    // Never surface an internal message: it can carry a key or upstream detail.
    return withCors(json({ error: 'internal', message: 'The request could not be completed.' }, 500));
  }
}
