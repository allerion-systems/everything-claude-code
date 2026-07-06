#!/usr/bin/env node
// Handoff (handoff.ai) Enterprise API MCP server - stdio transport.
// API docs: https://api.handoff.ai/docs (OpenAPI embedded).
// Auth: OAuth2 client_credentials. Set HANDOFF_CLIENT_ID (UUID from
// app.handoff.ai/settings/integrations?tab=api-keys) and HANDOFF_CLIENT_SECRET
// (the hnd_... key). Tokens are fetched and cached automatically.
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { ListToolsRequestSchema, CallToolRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import { readFile } from "node:fs/promises";
import { basename, extname } from "node:path";

const API_BASE = process.env.HANDOFF_API_BASE || "https://api.handoff.ai";
const CLIENT_ID = process.env.HANDOFF_CLIENT_ID || "";
const CLIENT_SECRET = process.env.HANDOFF_CLIENT_SECRET || "";

let token = null;
let tokenExpiry = 0;

async function getToken() {
  if (token && Date.now() < tokenExpiry - 60_000) return token;
  if (!CLIENT_ID || !CLIENT_SECRET) {
    throw new Error(
      "Set HANDOFF_CLIENT_ID (UUID) and HANDOFF_CLIENT_SECRET (hnd_... key) from " +
        "app.handoff.ai/settings/integrations?tab=api-keys"
    );
  }
  const res = await fetch(`${API_BASE}/v1/oauth/token`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      grant_type: "client_credentials",
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
    }),
  });
  if (!res.ok) throw new Error(`Handoff token exchange failed: ${res.status} ${await res.text()}`);
  const data = await res.json();
  token = data.access_token;
  tokenExpiry = Date.now() + (data.expires_in ?? 3600) * 1000;
  return token;
}

async function api(path, { method = "GET", body } = {}) {
  const t = await getToken();
  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${t}`,
      Accept: "application/json",
      ...(body ? { "Content-Type": "application/json" } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) throw new Error(`Handoff ${method} ${path} -> ${res.status}: ${await res.text()}`);
  const text = await res.text();
  try { return JSON.parse(text); } catch { return text; }
}

const MIME = {
  ".pdf": "application/pdf", ".doc": "application/msword",
  ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ".csv": "text/csv", ".txt": "text/plain", ".xls": "application/vnd.ms-excel",
  ".xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".gif": "image/gif",
  ".webp": "image/webp", ".bmp": "image/bmp", ".tiff": "image/tiff", ".tif": "image/tiff",
  ".svg": "image/svg+xml", ".heic": "image/heic", ".heif": "image/heif", ".avif": "image/avif",
};

async function uploadFiles(filePaths) {
  const files = filePaths.map((p) => ({
    filename: basename(p),
    contentType: MIME[extname(p).toLowerCase()] || "application/octet-stream",
  }));
  const { uploadUrls } = await api("/v1/files/upload-urls", { method: "POST", body: { files } });
  const fileIds = [];
  for (let i = 0; i < uploadUrls.length; i++) {
    const item = uploadUrls[i];
    const buf = await readFile(filePaths[i]);
    const put = await fetch(item.uploadUrl ?? item.url, {
      method: "PUT",
      headers: { "Content-Type": files[i].contentType },
      body: buf,
    });
    if (!put.ok) throw new Error(`Upload failed for ${filePaths[i]}: ${put.status}`);
    fileIds.push(item.fileId ?? item.id);
  }
  return fileIds;
}

const TOOLS = [
  {
    name: "handoff_status",
    description: "Verify Handoff Enterprise API credentials by performing a live token exchange.",
    inputSchema: { type: "object", properties: {} },
  },
  {
    name: "handoff_create_estimate",
    description:
      "Create a construction estimate. type=BLUEPRINT estimates from uploaded plan files (file_paths required); type=MATERIAL_LIST works from a prompt and/or files. Returns an estimateJobId to poll with handoff_get_estimate.",
    inputSchema: {
      type: "object",
      properties: {
        type: { type: "string", enum: ["MATERIAL_LIST", "BLUEPRINT"] },
        prompt: { type: "string", description: "Scope of work / special instructions (max 10000 chars)" },
        file_paths: {
          type: "array", items: { type: "string" },
          description: "Local paths of plans/material lists (PDF, DOCX, CSV, XLSX, images) - uploaded automatically",
        },
        address: { type: "string", description: "Address or ZIP for regional pricing, e.g. 'Louisville, KY 40223'" },
        externalId: { type: "string", description: "Your internal estimate id" },
        callbackUrl: { type: "string", description: "Webhook URL for completion notification" },
      },
      required: ["type"],
    },
  },
  {
    name: "handoff_get_estimate",
    description: "Get status/result of an estimate job by estimateJobId.",
    inputSchema: {
      type: "object",
      properties: { estimateJobId: { type: "string" } },
      required: ["estimateJobId"],
    },
  },
  {
    name: "handoff_update_estimate",
    description: "Update an existing estimate (body per api.handoff.ai/docs POST /v1/estimate/{id}/update).",
    inputSchema: {
      type: "object",
      properties: {
        estimateJobId: { type: "string" },
        body: { type: "object" },
      },
      required: ["estimateJobId", "body"],
    },
  },
  {
    name: "handoff_match_materials",
    description: "Run material matching against a partner-supplied item list (POST /v1/estimate/match).",
    inputSchema: {
      type: "object",
      properties: { body: { type: "object", description: "Match request per API docs" } },
      required: ["body"],
    },
  },
  {
    name: "handoff_get_presets",
    description: "Get AI presets (org/store/customer-level estimating preferences).",
    inputSchema: { type: "object", properties: {} },
  },
  {
    name: "handoff_set_presets",
    description: "Set AI presets (body per API docs POST /v1/presets).",
    inputSchema: {
      type: "object",
      properties: { body: { type: "object" } },
      required: ["body"],
    },
  },
  {
    name: "handoff_raw_request",
    description: "Escape hatch: call any Handoff Enterprise API endpoint (e.g. /v1/webhook/hmac).",
    inputSchema: {
      type: "object",
      properties: {
        method: { type: "string", enum: ["GET", "POST", "PUT", "PATCH", "DELETE"] },
        path: { type: "string", description: "Endpoint path starting with /" },
        body: { type: "object" },
      },
      required: ["method", "path"],
    },
  },
];

async function callTool(name, args) {
  switch (name) {
    case "handoff_status": {
      await getToken();
      return { configured: true, base: API_BASE, note: "Token exchange OK - Handoff Enterprise API is live." };
    }
    case "handoff_create_estimate": {
      const body = {
        type: args.type,
        ...(args.prompt ? { prompt: args.prompt } : {}),
        ...(args.address ? { address: args.address } : {}),
        ...(args.externalId ? { externalId: args.externalId } : {}),
        ...(args.callbackUrl ? { callbackUrl: args.callbackUrl } : {}),
      };
      if (args.file_paths?.length) body.fileIds = await uploadFiles(args.file_paths);
      return api("/v1/estimate", { method: "POST", body });
    }
    case "handoff_get_estimate":
      return api(`/v1/estimate/${args.estimateJobId}`);
    case "handoff_update_estimate":
      return api(`/v1/estimate/${args.estimateJobId}/update`, { method: "POST", body: args.body });
    case "handoff_match_materials":
      return api("/v1/estimate/match", { method: "POST", body: args.body });
    case "handoff_get_presets":
      return api("/v1/presets");
    case "handoff_set_presets":
      return api("/v1/presets", { method: "POST", body: args.body });
    case "handoff_raw_request":
      return api(args.path, { method: args.method, body: args.body });
    default:
      throw new Error(`Unknown tool: ${name}`);
  }
}

const server = new Server(
  { name: "handoff", version: "2.0.0" },
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
