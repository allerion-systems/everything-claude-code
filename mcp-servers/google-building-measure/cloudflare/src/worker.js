// ─────────────────────────────────────────────────────────────────────────
// Google Building Measure — Cloudflare Worker
//
// Deployed via "Deploy to Cloudflare" button. Provides:
//   GET  /              → web form (paste address, get report)
//   POST /api/measure   → JSON API (returns Roofr-style report)
//   POST /mcp           → MCP-over-HTTP endpoint (for Claude Desktop / OpenAI)
//
// Env vars required:
//   GOOGLE_MAPS_API_KEY — Google Cloud key with Geocoding, Maps Static,
//                        Street View, Solar, Aerial View APIs enabled
//   GEMINI_API_KEY     — Free key from aistudio.google.com
// ─────────────────────────────────────────────────────────────────────────

import { measureBuilding } from './measure.js';
import { handleMcp } from './mcp.js';
import { HTML_FORM } from './form.js';

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const cors = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    };

    if (request.method === 'OPTIONS') return new Response(null, { headers: cors });

    try {
      // ── Web form ─────────────────────────────────────────────────────
      if (url.pathname === '/' || url.pathname === '/index.html') {
        return new Response(HTML_FORM, {
          headers: { 'content-type': 'text/html; charset=utf-8', ...cors },
        });
      }

      // ── REST API ────────────────────────────────────────────────────
      if (url.pathname === '/api/measure' && request.method === 'POST') {
        const { address, skipStreetView, skipAerialView } = await request.json();
        if (!address) {
          return json({ error: 'Missing "address" in request body.' }, 400, cors);
        }
        const report = await measureBuilding({
          address,
          env,
          options: { skipStreetView: !!skipStreetView, skipAerialView: !!skipAerialView },
        });
        return json(report, 200, cors);
      }

      // ── MCP-over-HTTP ───────────────────────────────────────────────
      if (url.pathname === '/mcp' || url.pathname === '/sse') {
        return handleMcp(request, env, cors);
      }

      // ── Health check ────────────────────────────────────────────────
      if (url.pathname === '/health') {
        const hasMaps = !!env.GOOGLE_MAPS_API_KEY;
        const hasGemini = !!env.GEMINI_API_KEY;
        return json({ ok: hasMaps && hasGemini, googleMapsConfigured: hasMaps, geminiConfigured: hasGemini }, 200, cors);
      }

      return json({ error: `Not found: ${url.pathname}` }, 404, cors);
    } catch (err) {
      return json({ error: err.message, stack: err.stack?.split('\n').slice(0, 3) }, 500, cors);
    }
  },
};

function json(body, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(body, null, 2), {
    status,
    headers: { 'content-type': 'application/json', ...extraHeaders },
  });
}
