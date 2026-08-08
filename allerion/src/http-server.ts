#!/usr/bin/env node
// Allerion MCP server - Streamable HTTP transport. This is what you point
// Claude Apps / the Anthropic marketplace at: a single POST/GET/DELETE
// endpoint at /mcp speaking the MCP Streamable HTTP spec.
//
// One transport instance per session (the SDK manages session IDs via the
// Mcp-Session-Id header). Stateless mode is also supported by setting
// `sessionIdGenerator: undefined` if you want pure request/response.

import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { randomUUID } from "node:crypto";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { createMcpServer } from "./lib/mcp-server.js";

const PORT = parseInt(process.env.MCP_HTTP_PORT ?? "8788", 10);
const PATH = process.env.MCP_HTTP_PATH ?? "/mcp";

// Map of session id -> transport. The SDK assigns one on initialize and
// returns it via the Mcp-Session-Id response header.
const transports = new Map<string, StreamableHTTPServerTransport>();

const httpServer = createServer(async (req: IncomingMessage, res: ServerResponse) => {
  // CORS - required so browser-side MCP clients (and Claude Apps preview iframes) can reach us.
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Headers", "content-type, mcp-session-id, authorization");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, DELETE, OPTIONS");
  res.setHeader("Access-Control-Expose-Headers", "mcp-session-id");
  if (req.method === "OPTIONS") {
    res.writeHead(204).end();
    return;
  }

  if (req.url === "/healthz") {
    res.writeHead(200, { "content-type": "application/json" });
    res.end(JSON.stringify({ ok: true, name: "allerion", version: "0.0.3", sessions: transports.size }));
    return;
  }

  if (!req.url?.startsWith(PATH)) {
    res.writeHead(404).end("not found");
    return;
  }

  // Find or create the transport for this session.
  const sessionHeader = req.headers["mcp-session-id"];
  const sessionId = Array.isArray(sessionHeader) ? sessionHeader[0] : sessionHeader;
  let transport = sessionId ? transports.get(sessionId) : undefined;

  if (!transport) {
    transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: () => randomUUID(),
      onsessioninitialized: (id) => {
        transports.set(id, transport!);
      },
    });
    transport.onclose = () => {
      if (transport!.sessionId) transports.delete(transport!.sessionId);
    };
    const server = createMcpServer();
    await server.connect(transport);
  }

  // Buffer + parse JSON body so we can pass it as parsedBody (skips a re-read inside the SDK).
  let parsedBody: unknown = undefined;
  if (req.method === "POST") {
    let raw = "";
    for await (const chunk of req) raw += chunk;
    if (raw) {
      try {
        parsedBody = JSON.parse(raw);
      } catch {
        res.writeHead(400).end("invalid json");
        return;
      }
    }
  }

  await transport.handleRequest(req, res, parsedBody);
});

httpServer.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`[allerion] mcp http server on http://localhost:${PORT}${PATH}`);
  // eslint-disable-next-line no-console
  console.log(`[allerion] health check: http://localhost:${PORT}/healthz`);
});
