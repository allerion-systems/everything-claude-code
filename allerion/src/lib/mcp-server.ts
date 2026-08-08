// Factory that returns a fully wired MCP Server. Used by both transports
// (stdio + Streamable HTTP) so behaviour is identical regardless of how the
// client connects. Adding capability surfaces here flows through to both.

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ListPromptsRequestSchema,
  GetPromptRequestSchema,
  ListResourcesRequestSchema,
  ListResourceTemplatesRequestSchema,
  ReadResourceRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";

import { geocode, geocodeSchema } from "../tools/geocode.js";
import { flyToBuilding, flyToBuildingSchema } from "../tools/fly-to-building.js";
import { measure, measureSchema } from "../tools/measure.js";
import { exportIfc, exportIfcSchema } from "../tools/export-ifc.js";
import { autoTakeoff, autoTakeoffSchema } from "../tools/auto-takeoff.js";
import { estimateCosts, estimateCostsSchema } from "../tools/estimate-costs.js";
import { open5dDashboard, open5dDashboardSchema } from "../tools/open-5d-dashboard.js";
import { sessionStore } from "./session-store.js";

const SERVER_INFO = { name: "allerion", version: "0.0.3" };

// ---------------- Tools ----------------

interface ToolDef {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
  annotations?: {
    title?: string;
    readOnlyHint?: boolean;
    destructiveHint?: boolean;
    idempotentHint?: boolean;
    openWorldHint?: boolean;
  };
}

const TOOLS: ToolDef[] = [
  {
    name: "geocode",
    description:
      "Geocode a street address to lat/lon. Uses Mapbox if MAPBOX_TOKEN is set, " +
      "else OpenStreetMap Nominatim. Free, no side effects.",
    inputSchema: zodToJsonSchema(geocodeSchema),
    annotations: { title: "Geocode address", readOnlyHint: true, openWorldHint: true, idempotentHint: true },
  },
  {
    name: "fly_to_building",
    description:
      "Open an interactive 3D Cesium viewer at an address (Google Photorealistic " +
      "3D Tiles or OSM Buildings extrusions). Returns an MCP App embedded in chat " +
      "and a session_id used by every downstream tool. Side effect: creates the session.",
    inputSchema: zodToJsonSchema(flyToBuildingSchema),
    annotations: { title: "Open building viewer", readOnlyHint: false, openWorldHint: true, idempotentHint: false },
  },
  {
    name: "measure",
    description:
      "Record a measurement from points the user clicked in the viewer. " +
      "Modes: 'polyline' (segments), 'polygon' (footprint area), " +
      "'vertical' (height between two points), 'pitch' (roof slope from 3 points). " +
      "Stores the result on the session.",
    inputSchema: zodToJsonSchema(measureSchema),
    annotations: { title: "Record measurement", readOnlyHint: false, idempotentHint: false },
  },
  {
    name: "auto_takeoff",
    description:
      "Autonomously extract building geometry from OpenStreetMap for the session's " +
      "address. Pulls the footprint and infers height from `building:levels` (3m/story " +
      "default). Falls back to a 10m square if OSM has no building. Use " +
      "roof_material / facade_material to classify materials (infer from the viewer " +
      "screenshot if you can). After this, estimate_costs and open_5d_dashboard work " +
      "with zero user clicks.",
    inputSchema: zodToJsonSchema(autoTakeoffSchema),
    annotations: { title: "Auto-extract building geometry", readOnlyHint: false, openWorldHint: true, idempotentHint: true },
  },
  {
    name: "estimate_costs",
    description:
      "Compute a 5D cost estimate (Material / Labor / Equipment / Total) for the " +
      "session's building. Pulls live unit rates from the open DDC CWICR construction " +
      "cost API (CC-BY-4.0, 55K+ items), falls back to Allerion defaults when the API " +
      "has no unit-matching result. Pass rate_overrides to plug in your own cost book.",
    inputSchema: zodToJsonSchema(estimateCostsSchema),
    annotations: { title: "Estimate 5D costs", readOnlyHint: false, openWorldHint: true, idempotentHint: true },
  },
  {
    name: "open_5d_dashboard",
    description:
      "Render the Bexel-style 5D Estimation dashboard as an MCP App: totals cards, " +
      "Cesium viewer with the building extruded and color-coded by classification, " +
      "per-element cost table, and three doughnut charts. Runs estimate_costs " +
      "automatically if not already cached.",
    inputSchema: zodToJsonSchema(open5dDashboardSchema),
    annotations: { title: "Open 5D dashboard", readOnlyHint: false, idempotentHint: true },
  },
  {
    name: "export_ifc",
    description:
      "Export the session's footprint + height as a valid IFC2X3 building model " +
      "(perimeter walls + flat roof slab). Returns the IFC STEP text inline. Loads " +
      "in BIMvision, BIMcollab Zoom, Solibri, Revit (import).",
    inputSchema: zodToJsonSchema(exportIfcSchema),
    annotations: { title: "Export IFC", readOnlyHint: true, idempotentHint: true },
  },
];

async function dispatchTool(name: string, args: unknown) {
  switch (name) {
    case "geocode":
      return toolResult(await geocode(args as never));
    case "fly_to_building": {
      const result = await flyToBuilding(args as never);
      return {
        content: [
          { type: "text" as const, text: JSON.stringify(stripHtml(result), null, 2) },
          {
            type: "resource" as const,
            resource: { uri: result.viewer_url, mimeType: "text/html", text: result.app_html },
          },
        ],
      };
    }
    case "measure":
      return toolResult(measure(args as never));
    case "auto_takeoff":
      return toolResult(await autoTakeoff(args as never));
    case "estimate_costs":
      return toolResult(await estimateCosts(args as never));
    case "open_5d_dashboard": {
      const result = await open5dDashboard(args as never);
      return {
        content: [
          { type: "text" as const, text: JSON.stringify(stripHtml(result), null, 2) },
          {
            type: "resource" as const,
            resource: { uri: result.dashboard_url, mimeType: "text/html", text: result.app_html },
          },
        ],
      };
    }
    case "export_ifc": {
      const result = exportIfc(args as never);
      return {
        content: [
          {
            type: "text" as const,
            text:
              `Exported ${result.filename} (${result.ifc_bytes} bytes). Save the IFC payload below to a .ifc file.\n\n` +
              "```ifc\n" +
              result.ifc +
              "\n```",
          },
        ],
      };
    }
    default:
      return { isError: true, content: [{ type: "text" as const, text: `Unknown tool: ${name}` }] };
  }
}

// ---------------- Prompts ----------------

interface PromptDef {
  name: string;
  description: string;
  arguments: Array<{ name: string; description: string; required: boolean }>;
}

const PROMPTS: PromptDef[] = [
  {
    name: "estimate-from-address",
    description:
      "End-to-end 5D estimate from a street address: fly to the building, auto-extract " +
      "geometry from OSM, classify materials from the viewer, price against live cost " +
      "API, render the Bexel-style dashboard.",
    arguments: [
      { name: "address", description: "Street address to estimate", required: true },
      { name: "provider", description: "google-3d-tiles | osm-buildings (default: auto)", required: false },
    ],
  },
  {
    name: "compare-buildings",
    description:
      "Run 5D estimates on multiple addresses and present a side-by-side cost comparison.",
    arguments: [
      { name: "addresses", description: "Comma-separated list of street addresses", required: true },
    ],
  },
  {
    name: "audit-takeoff",
    description:
      "Critically review a session's quantity takeoff (areas, volumes, classifications) " +
      "and flag anything that looks off before pricing.",
    arguments: [
      { name: "session_id", description: "Session UUID from fly_to_building or auto_takeoff", required: true },
    ],
  },
];

function getPromptMessages(name: string, args: Record<string, string>) {
  switch (name) {
    case "estimate-from-address": {
      const provider = args.provider ? ` Use provider="${args.provider}".` : "";
      return [
        {
          role: "user" as const,
          content: {
            type: "text" as const,
            text:
              `Produce a complete 5D cost estimate for the building at: ${args.address}.\n\n` +
              `Run this pipeline using the Allerion MCP tools:\n` +
              `1. fly_to_building(address="${args.address}").${provider}\n` +
              `2. Look at the viewer screenshot. Identify roof_material and facade_material.\n` +
              `3. auto_takeoff(session_id=..., roof_material=..., facade_material=...).\n` +
              `4. Check the auto_takeoff next_steps and resolve anything ambiguous.\n` +
              `5. estimate_costs(session_id=...).\n` +
              `6. open_5d_dashboard(session_id=...).\n` +
              `7. Summarize: total cost, $/sq ft, top 3 cost drivers, anything that warrants the user's attention.`,
          },
        },
      ];
    }
    case "compare-buildings": {
      const addrs = (args.addresses ?? "").split(",").map((a) => a.trim()).filter(Boolean);
      return [
        {
          role: "user" as const,
          content: {
            type: "text" as const,
            text:
              `Compare 5D construction costs across these ${addrs.length} buildings: ${addrs.join("; ")}.\n\n` +
              `For each: run fly_to_building -> auto_takeoff -> estimate_costs. Then produce a comparison ` +
              `table with: address, gross floor area, total cost, $/sq ft, dominant cost classification. ` +
              `Call out outliers and explain likely reasons (size, materials, OSM data gaps).`,
          },
        },
      ];
    }
    case "audit-takeoff": {
      return [
        {
          role: "user" as const,
          content: {
            type: "text" as const,
            text:
              `Audit the takeoff for session_id=${args.session_id} before pricing.\n\n` +
              `Steps:\n` +
              `1. Read the session at allerion://sessions/${args.session_id}.\n` +
              `2. For each takeoff row, sanity-check: does the quantity match what you'd expect for the ` +
              `building footprint and height? Is the classification right? Is the search_query specific ` +
              `enough to get a good live cost match?\n` +
              `3. Flag any concerns (zero-area floors, missing roof, suspicious materials).\n` +
              `4. Only after audit, call estimate_costs.`,
          },
        },
      ];
    }
    default:
      throw new Error(`Unknown prompt: ${name}`);
  }
}

// ---------------- Resources ----------------

interface ResourceDef {
  uri: string;
  name: string;
  description: string;
  mimeType: string;
}

const STATIC_RESOURCES: ResourceDef[] = [
  {
    uri: "allerion://cost-library/defaults",
    name: "Default Cost Rate Book",
    description:
      "Allerion's tiny hand-curated default rate book (6 UniFormat codes). " +
      "Used when the live DDC CWICR API has no unit-matching result. Override-friendly.",
    mimeType: "application/json",
  },
  {
    uri: "allerion://docs/getting-started",
    name: "Allerion - Getting Started",
    description: "Setup, autonomous flow, available tools, marketplace install.",
    mimeType: "text/markdown",
  },
];

const RESOURCE_TEMPLATES = [
  {
    uriTemplate: "allerion://sessions/{id}",
    name: "Session State",
    description:
      "Live session JSON: address, lat/lon, footprint, building height, materials, " +
      "measurements, last estimate. Useful for the audit-takeoff prompt.",
    mimeType: "application/json",
  },
];

async function readResource(uri: string) {
  if (uri === "allerion://cost-library/defaults") {
    const { defaultRate } = await import("./cost-library.js");
    const codes = ["A1010", "A2010", "B1010", "B2010", "B3010", "C1010"];
    const book = Object.fromEntries(codes.map((c) => [c, defaultRate(c)]));
    return [
      {
        uri,
        mimeType: "application/json",
        text: JSON.stringify({ source: "Allerion v0 defaults", currency: "USD", rates: book }, null, 2),
      },
    ];
  }

  if (uri === "allerion://docs/getting-started") {
    const { readFile } = await import("node:fs/promises");
    const { dirname, join } = await import("node:path");
    const { fileURLToPath } = await import("node:url");
    const __dirname = dirname(fileURLToPath(import.meta.url));
    const path = join(__dirname, "..", "..", "README.md");
    return [{ uri, mimeType: "text/markdown", text: await readFile(path, "utf-8") }];
  }

  const sessionMatch = uri.match(/^allerion:\/\/sessions\/([0-9a-f-]+)$/i);
  if (sessionMatch) {
    const session = sessionStore.get(sessionMatch[1]!);
    return [{ uri, mimeType: "application/json", text: JSON.stringify(session, null, 2) }];
  }

  throw new Error(`Unknown resource: ${uri}`);
}

// ---------------- Factory ----------------

export function createMcpServer(): Server {
  const server = new Server(SERVER_INFO, {
    capabilities: { tools: {}, prompts: {}, resources: {} },
  });

  server.setRequestHandler(ListToolsRequestSchema, async () => {
    sessionStore.gc();
    return { tools: TOOLS };
  });
  server.setRequestHandler(CallToolRequestSchema, async (req) => {
    try {
      return await dispatchTool(req.params.name, req.params.arguments);
    } catch (err) {
      return { isError: true, content: [{ type: "text" as const, text: err instanceof Error ? err.message : String(err) }] };
    }
  });

  server.setRequestHandler(ListPromptsRequestSchema, async () => ({ prompts: PROMPTS }));
  server.setRequestHandler(GetPromptRequestSchema, async (req) => ({
    description: PROMPTS.find((p) => p.name === req.params.name)?.description,
    messages: getPromptMessages(req.params.name, (req.params.arguments ?? {}) as Record<string, string>),
  }));

  server.setRequestHandler(ListResourcesRequestSchema, async () => ({ resources: STATIC_RESOURCES }));
  server.setRequestHandler(ListResourceTemplatesRequestSchema, async () => ({
    resourceTemplates: RESOURCE_TEMPLATES,
  }));
  server.setRequestHandler(ReadResourceRequestSchema, async (req) => ({
    contents: await readResource(req.params.uri),
  }));

  return server;
}

// ---------------- Helpers ----------------

function toolResult(payload: unknown) {
  return {
    content: [{ type: "text" as const, text: JSON.stringify(stripHtml(payload), null, 2) }],
  };
}

function stripHtml(obj: unknown): unknown {
  if (obj && typeof obj === "object" && "app_html" in obj) {
    const { app_html: _omit, ...rest } = obj as Record<string, unknown>;
    return rest;
  }
  return obj;
}

function zodToJsonSchema(schema: z.ZodTypeAny): Record<string, unknown> {
  const def: z.ZodTypeDef & { typeName?: string } = schema._def as never;
  const tn = (def as { typeName?: string }).typeName;
  switch (tn) {
    case "ZodObject": {
      const shape = (schema as z.ZodObject<z.ZodRawShape>).shape;
      const properties: Record<string, unknown> = {};
      const required: string[] = [];
      for (const [key, value] of Object.entries(shape)) {
        properties[key] = zodToJsonSchema(value);
        if (!(value as z.ZodTypeAny).isOptional()) required.push(key);
      }
      return { type: "object", properties, required, additionalProperties: false };
    }
    case "ZodString":
      return { type: "string" };
    case "ZodNumber":
      return { type: "number" };
    case "ZodBoolean":
      return { type: "boolean" };
    case "ZodArray":
      return { type: "array", items: zodToJsonSchema((schema as z.ZodArray<z.ZodTypeAny>).element) };
    case "ZodEnum":
      return { type: "string", enum: (schema as z.ZodEnum<[string, ...string[]]>).options };
    case "ZodOptional":
      return zodToJsonSchema((schema as z.ZodOptional<z.ZodTypeAny>).unwrap());
    case "ZodRecord":
      return { type: "object", additionalProperties: true };
    default:
      return {};
  }
}
