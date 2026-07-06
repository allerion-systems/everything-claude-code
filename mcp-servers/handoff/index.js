#!/usr/bin/env node
// Handoff (handoff.ai) MCP server - stdio transport.
//
// IMPORTANT: As of 2026-07, Handoff has NO public API
// (https://help.handoff.ai/en/articles/9778505-does-handoff-have-an-api).
// This server is a ready-to-go scaffold: point HANDOFF_API_BASE at a partner/private
// API endpoint and set HANDOFF_API_KEY the day credentials exist, and the generic
// tools below work immediately. handoff_status always explains the current state.
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { ListToolsRequestSchema, CallToolRequestSchema } from "@modelcontextprotocol/sdk/types.js";

const API_BASE = process.env.HANDOFF_API_BASE || "";
const API_KEY = process.env.HANDOFF_API_KEY || "";
const AUTH_HEADER = process.env.HANDOFF_AUTH_HEADER || "Authorization";
const AUTH_PREFIX = process.env.HANDOFF_AUTH_PREFIX ?? "Bearer ";

function configured() {
  return Boolean(API_BASE && API_KEY);
}

async function handoffFetch(path, { method = "GET", body } = {}) {
  if (!configured()) {
    throw new Error(
      "Handoff API not configured. Handoff has no public API yet " +
        "(help.handoff.ai article 9778505). When you obtain partner/private API access, " +
        "set HANDOFF_API_BASE and HANDOFF_API_KEY and these tools go live."
    );
  }
  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers: {
      [AUTH_HEADER]: `${AUTH_PREFIX}${API_KEY}`,
      Accept: "application/json",
      ...(body ? { "Content-Type": "application/json" } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) throw new Error(`Handoff API ${method} ${path} -> ${res.status}: ${await res.text()}`);
  const text = await res.text();
  try { return JSON.parse(text); } catch { return text; }
}

const TOOLS = [
  {
    name: "handoff_status",
    description:
      "Report whether the Handoff integration is configured and how to configure it. Call this first.",
    inputSchema: { type: "object", properties: {} },
  },
  {
    name: "handoff_request",
    description:
      "Call a Handoff API endpoint (requires HANDOFF_API_BASE + HANDOFF_API_KEY). Generic REST passthrough for estimates, projects, and clients once API access exists.",
    inputSchema: {
      type: "object",
      properties: {
        method: { type: "string", enum: ["GET", "POST", "PUT", "PATCH", "DELETE"] },
        path: { type: "string", description: "Endpoint path starting with /" },
        body: { type: "object", description: "JSON body for mutating requests" },
      },
      required: ["method", "path"],
    },
  },
];

async function callTool(name, args) {
  switch (name) {
    case "handoff_status":
      return configured()
        ? { configured: true, base: API_BASE, note: "Handoff API credentials present; handoff_request is live." }
        : {
            configured: false,
            note:
              "Handoff (handoff.ai) has no public API as of 2026-07 - see " +
              "https://help.handoff.ai/en/articles/9778505-does-handoff-have-an-api. " +
              "Ask Handoff support for partner API access; then set HANDOFF_API_BASE and " +
              "HANDOFF_API_KEY (optionally HANDOFF_AUTH_HEADER / HANDOFF_AUTH_PREFIX). " +
              "Until then, move estimates in/out of Handoff via their app's export files (PDF/CSV).",
          };
    case "handoff_request":
      return handoffFetch(args.path, { method: args.method, body: args.body });
    default:
      throw new Error(`Unknown tool: ${name}`);
  }
}

const server = new Server(
  { name: "handoff", version: "1.0.0" },
  { capabilities: { tools: {} } }
);

server.setRequestHandler(ListToolsRequestSchema, async () => ({ tools: TOOLS }));

server.setRequestHandler(CallToolRequestSchema, async (req) => {
  try {
    const result = await callTool(req.params.name, req.params.arguments ?? {});
    const text = typeof result === "string" ? result : JSON.stringify(result, null, 2);
    return { content: [{ type: "text", text }] };
  } catch (err) {
    return { content: [{ type: "text", text: `Error: ${err.message}` }], isError: true };
  }
});

await server.connect(new StdioServerTransport());
