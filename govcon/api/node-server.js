#!/usr/bin/env node
// Node entry point — for running the API on your own server instead of
// Cloudflare Workers. Same router, same handlers; only the transport differs.
//
//   OPENAI_API_KEY=... API_KEYS=... node node-server.js
//
// Terminate TLS in front of this (Caddy, nginx, or a load balancer). It speaks
// plain HTTP and trusts that whatever proxies it handles certificates.

import http from 'node:http';
import { route } from './src/router.js';

const PORT = Number(process.env.PORT || 8787);
const HOST = process.env.HOST || '127.0.0.1';

function toRequest(req) {
  const url = `http://${req.headers.host || 'localhost'}${req.url}`;
  const hasBody = req.method !== 'GET' && req.method !== 'HEAD';
  return new Request(url, {
    method: req.method,
    headers: req.headers,
    body: hasBody ? req : undefined,
    duplex: hasBody ? 'half' : undefined,
  });
}

async function send(res, response) {
  res.writeHead(response.status, Object.fromEntries(response.headers));
  if (!response.body) return res.end();
  // Stream through, so Server-Sent Events reach the client as they arrive.
  for await (const chunk of response.body) res.write(chunk);
  res.end();
}

const server = http.createServer(async (req, res) => {
  try {
    await send(res, await route(toRequest(req), process.env));
  } catch {
    if (!res.headersSent) res.writeHead(500, { 'content-type': 'application/json' });
    res.end(JSON.stringify({ error: 'internal', message: 'The request could not be completed.' }));
  }
});

server.listen(PORT, HOST, () => {
  console.log(`allerion-api listening on http://${HOST}:${PORT}`);
  if (!process.env.API_KEYS) console.warn('WARNING: API_KEYS is unset — every request will be refused.');
  if (!process.env.OPENAI_API_KEY) console.warn('WARNING: OPENAI_API_KEY is unset — model routes return 503.');
});

for (const sig of ['SIGINT', 'SIGTERM']) {
  process.on(sig, () => server.close(() => process.exit(0)));
}
