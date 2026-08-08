// Serves the Cesium viewer + 5D dashboard HTML so MCP clients can iframe
// them. Also exposes:
//  - POST /measure           accepts viewer click measurements
//  - GET  /estimate?session  returns the cached 5D estimate (runs one if absent)
//  - GET  /session?session   returns the session geometry the dashboard needs

import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { join, dirname, extname } from "node:path";
import { fileURLToPath } from "node:url";
import { measure } from "./tools/measure.js";
import { estimateCosts } from "./tools/estimate-costs.js";
import { sessionStore } from "./lib/session-store.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PUBLIC_DIR = join(__dirname, "..", "public");
const PORT = parseInt(process.env.VIEWER_PORT ?? "8787", 10);

const MIME: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
};

const server = createServer(async (req, res) => {
  if (!req.url) {
    res.writeHead(400);
    res.end("bad request");
    return;
  }

  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Headers", "content-type");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  if (req.method === "OPTIONS") {
    res.writeHead(204);
    res.end();
    return;
  }

  const url = new URL(req.url, `http://localhost:${PORT}`);

  if (req.method === "POST" && url.pathname === "/measure") {
    let body = "";
    for await (const chunk of req) body += chunk;
    try {
      const result = measure(JSON.parse(body));
      sendJson(res, 200, result);
    } catch (e) {
      sendError(res, 400, e);
    }
    return;
  }

  if (req.method === "GET" && url.pathname === "/estimate") {
    const session_id = url.searchParams.get("session");
    if (!session_id) return sendJson(res, 400, { error: "Missing session param" });
    try {
      const result = await estimateCosts({ session_id });
      sendJson(res, 200, result);
    } catch (e) {
      sendJson(res, 400, { error: e instanceof Error ? e.message : String(e) });
    }
    return;
  }

  if (req.method === "GET" && url.pathname === "/session") {
    const session_id = url.searchParams.get("session");
    if (!session_id) return sendJson(res, 400, { error: "Missing session param" });
    const s = sessionStore.get(session_id);
    sendJson(res, 200, s);
    return;
  }

  // Static files.
  const path = url.pathname === "/" ? "/viewer.html" : url.pathname;
  const filePath = join(PUBLIC_DIR, path);
  if (!filePath.startsWith(PUBLIC_DIR)) {
    res.writeHead(403);
    res.end("forbidden");
    return;
  }
  try {
    const body = await readFile(filePath);
    res.writeHead(200, { "content-type": MIME[extname(filePath)] ?? "application/octet-stream" });
    res.end(body);
  } catch {
    res.writeHead(404);
    res.end("not found");
  }
});

function sendJson(res: import("node:http").ServerResponse, status: number, body: unknown) {
  res.writeHead(status, { "content-type": "application/json" });
  res.end(JSON.stringify(body));
}

function sendError(res: import("node:http").ServerResponse, status: number, err: unknown) {
  res.writeHead(status);
  res.end(err instanceof Error ? err.message : String(err));
}

server.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`[allerion] viewer http://localhost:${PORT}`);
  // eslint-disable-next-line no-console
  console.log(`[allerion] 5D dashboard http://localhost:${PORT}/dashboard-5d.html`);
});
