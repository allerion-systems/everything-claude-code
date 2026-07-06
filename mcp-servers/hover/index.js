#!/usr/bin/env node
// HOVER (hover.to) MCP server - stdio transport.
// Auth: set HOVER_ACCESS_TOKEN, or HOVER_CLIENT_ID + HOVER_CLIENT_SECRET + HOVER_REFRESH_TOKEN
// for automatic refresh. API reference: https://developers.hover.to
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { ListToolsRequestSchema, CallToolRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import { writeFile } from "node:fs/promises";

const API_BASE = process.env.HOVER_API_BASE || "https://api.hover.to/v2";
const TOKEN_URL = process.env.HOVER_TOKEN_URL || "https://hover.to/oauth/token";

let accessToken = process.env.HOVER_ACCESS_TOKEN || null;

async function refreshAccessToken() {
  const { HOVER_CLIENT_ID, HOVER_CLIENT_SECRET, HOVER_REFRESH_TOKEN } = process.env;
  if (!HOVER_CLIENT_ID || !HOVER_CLIENT_SECRET || !HOVER_REFRESH_TOKEN) {
    throw new Error(
      "No valid HOVER credentials. Set HOVER_ACCESS_TOKEN, or HOVER_CLIENT_ID + HOVER_CLIENT_SECRET + HOVER_REFRESH_TOKEN."
    );
  }
  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      grant_type: "refresh_token",
      client_id: HOVER_CLIENT_ID,
      client_secret: HOVER_CLIENT_SECRET,
      refresh_token: HOVER_REFRESH_TOKEN,
    }),
  });
  if (!res.ok) throw new Error(`Token refresh failed: ${res.status} ${await res.text()}`);
  const data = await res.json();
  accessToken = data.access_token;
  return accessToken;
}

async function hoverFetch(path, { method = "GET", body, binary = false, retried = false } = {}) {
  if (!accessToken) await refreshAccessToken();
  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: binary ? "*/*" : "application/json",
      ...(body ? { "Content-Type": "application/json" } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (res.status === 401 && !retried) {
    await refreshAccessToken();
    return hoverFetch(path, { method, body, binary, retried: true });
  }
  if (!res.ok) throw new Error(`HOVER API ${method} ${path} -> ${res.status}: ${await res.text()}`);
  if (binary) return Buffer.from(await res.arrayBuffer());
  const text = await res.text();
  try { return JSON.parse(text); } catch { return text; }
}

const MEASUREMENT_FORMATS = ["json", "pdf", "xlsx", "skp", "xml", "esx", "fml"];

const TOOLS = [
  {
    name: "hover_list_jobs",
    description: "List HOVER jobs (measured properties). Optionally include archived jobs or paginate.",
    inputSchema: {
      type: "object",
      properties: {
        archived: { type: "boolean", description: "Include archived jobs" },
        page: { type: "number", description: "Page number" },
      },
    },
  },
  {
    name: "hover_get_job",
    description: "Get details for one HOVER job: state, address, links to measurements and images.",
    inputSchema: {
      type: "object",
      properties: { job_id: { type: "number", description: "HOVER job id" } },
      required: ["job_id"],
    },
  },
  {
    name: "hover_get_measurements",
    description:
      "Fetch a job's measurements. format=json returns the data inline; binary formats (pdf, xlsx, skp, xml, esx, fml) are written to output_path and the path is returned. skp gives the SketchUp model of the property.",
    inputSchema: {
      type: "object",
      properties: {
        job_id: { type: "number" },
        format: { type: "string", enum: MEASUREMENT_FORMATS, description: "Deliverable format (default json)" },
        output_path: { type: "string", description: "Absolute file path to write binary formats to" },
      },
      required: ["job_id"],
    },
  },
  {
    name: "hover_create_capture_request",
    description:
      "Create a capture request: invites a homeowner/rep by email to photograph a property with the HOVER app, which produces a measured 3D job.",
    inputSchema: {
      type: "object",
      properties: {
        body: {
          type: "object",
          description:
            "capture_request payload per developers.hover.to (e.g. {capture_request: {client_email, client_name, location_line_1, ...}})",
        },
      },
      required: ["body"],
    },
  },
  {
    name: "hover_list_capture_requests",
    description: "List capture requests for the authenticated user/org.",
    inputSchema: { type: "object", properties: {} },
  },
  {
    name: "hover_get_wireframe_images",
    description: "Get wireframe images (url/compass/top) for a model.",
    inputSchema: {
      type: "object",
      properties: { model_id: { type: "number" } },
      required: ["model_id"],
    },
  },
  {
    name: "hover_raw_request",
    description:
      "Escape hatch: call any HOVER API endpoint (e.g. path=/webhooks, /organizations, /test_jobs/single_structure). Path is appended to the API base.",
    inputSchema: {
      type: "object",
      properties: {
        method: { type: "string", enum: ["GET", "POST", "PATCH", "DELETE"] },
        path: { type: "string", description: "Endpoint path starting with /" },
        body: { type: "object", description: "JSON body for POST/PATCH" },
      },
      required: ["method", "path"],
    },
  },
];

async function callTool(name, args) {
  switch (name) {
    case "hover_list_jobs": {
      const q = new URLSearchParams();
      if (args.archived) q.set("archived", "true");
      if (args.page) q.set("page", String(args.page));
      const qs = q.toString();
      return hoverFetch(`/jobs${qs ? `?${qs}` : ""}`);
    }
    case "hover_get_job":
      return hoverFetch(`/jobs/${args.job_id}`);
    case "hover_get_measurements": {
      const format = args.format || "json";
      if (format === "json") return hoverFetch(`/jobs/${args.job_id}/measurements/json`);
      if (!args.output_path) throw new Error(`format=${format} is binary - provide output_path`);
      const buf = await hoverFetch(`/jobs/${args.job_id}/measurements/${format}`, { binary: true });
      await writeFile(args.output_path, buf);
      return { saved: args.output_path, bytes: buf.length, format };
    }
    case "hover_create_capture_request":
      return hoverFetch("/capture_requests", { method: "POST", body: args.body });
    case "hover_list_capture_requests":
      return hoverFetch("/capture_requests");
    case "hover_get_wireframe_images":
      return hoverFetch(`/models/${args.model_id}/wireframe_images`);
    case "hover_raw_request":
      return hoverFetch(args.path, { method: args.method, body: args.body });
    default:
      throw new Error(`Unknown tool: ${name}`);
  }
}

const server = new Server(
  { name: "hover", version: "1.0.0" },
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
