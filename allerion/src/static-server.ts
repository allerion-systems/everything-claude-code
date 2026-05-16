// Serves the Cesium viewer HTML so MCP clients can iframe it.
// Also accepts POSTed measurements from the viewer (when running in
// hosted mode) so the chat side can be notified out-of-band.

import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { join, dirname, extname } from "node:path";
import { fileURLToPath } from "node:url";
import { measure } from "./tools/measure.js";

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

  // CORS so the viewer can run inside any MCP client iframe.
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
      res.writeHead(200, { "content-type": "application/json" });
      res.end(JSON.stringify(result));
    } catch (e) {
      res.writeHead(400);
      res.end(e instanceof Error ? e.message : String(e));
    }
    return;
  }

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

server.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`[allerion] viewer http://localhost:${PORT}`);
});
