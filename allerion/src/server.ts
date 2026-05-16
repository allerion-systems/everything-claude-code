#!/usr/bin/env node
// Allerion MCP server. Exposes the full Allerion Measure + 5D Estimation
// toolset over stdio - the standard transport for Claude Desktop, Cursor,
// and VS Code MCP. The viewer + dashboard HTML are served separately by
// static-server.ts.

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";

import { geocode, geocodeSchema } from "./tools/geocode.js";
import { flyToBuilding, flyToBuildingSchema } from "./tools/fly-to-building.js";
import { measure, measureSchema } from "./tools/measure.js";
import { exportIfc, exportIfcSchema } from "./tools/export-ifc.js";
import { autoTakeoff, autoTakeoffSchema } from "./tools/auto-takeoff.js";
import { estimateCosts, estimateCostsSchema } from "./tools/estimate-costs.js";
import { open5dDashboard, open5dDashboardSchema } from "./tools/open-5d-dashboard.js";
import { sessionStore } from "./lib/session-store.js";

const server = new Server(
  { name: "allerion", version: "0.0.2" },
  { capabilities: { tools: {} } },
);

const TOOLS = [
  {
    name: "geocode",
    description:
      "Geocode a street address to lat/lon. Uses Mapbox if MAPBOX_TOKEN is set, " +
      "else falls back to OpenStreetMap Nominatim.",
    inputSchema: zodToJsonSchema(geocodeSchema),
  },
  {
    name: "fly_to_building",
    description:
      "Render an interactive 3D viewer at a given address. Returns an MCP App " +
      "(embedded HTML) showing the building on Google Photorealistic 3D Tiles " +
      "or OSM Buildings extrusions. The returned session_id is used by all " +
      "downstream tools (measure, auto_takeoff, estimate_costs, etc.).",
    inputSchema: zodToJsonSchema(flyToBuildingSchema),
  },
  {
    name: "measure",
    description:
      "Record a measurement from points the user clicked in the viewer. " +
      "Modes: 'polyline' (segment lengths), 'polygon' (footprint area), " +
      "'vertical' (height between two points), 'pitch' (roof slope from 3 points).",
    inputSchema: zodToJsonSchema(measureSchema),
  },
  {
    name: "auto_takeoff",
    description:
      "Autonomously extract building geometry from OpenStreetMap Buildings " +
      "for the session's address. Pulls the footprint polygon and infers " +
      "height from `building:levels` (default 3m/story). Falls back to a " +
      "10m square centered on the lat/lon if OSM has no building. " +
      "Use roof_material / facade_material params to classify materials " +
      "(infer from the viewer screenshot if you can). Sets the session up " +
      "so estimate_costs and open_5d_dashboard work with zero user clicks.",
    inputSchema: zodToJsonSchema(autoTakeoffSchema),
  },
  {
    name: "estimate_costs",
    description:
      "Compute a 5D cost estimate (Material / Labor / Equipment / Total) for " +
      "the session's building. Pulls live unit rates from the open-source " +
      "DDC CWICR construction cost API (CC-BY-4.0, 55K+ items, 30 regions) " +
      "and falls back to Allerion default rates when the API misses. Returns " +
      "per-element breakdown plus totals. Pass rate_overrides to plug in your " +
      "own cost book per UniFormat code.",
    inputSchema: zodToJsonSchema(estimateCostsSchema),
  },
  {
    name: "open_5d_dashboard",
    description:
      "Render the Bexel-style 5D Estimation dashboard for the session as an " +
      "MCP App: top-bar totals, Cesium viewer with the building extruded and " +
      "color-coded by classification, per-element cost table, and " +
      "cost-by-classification / -component / -source doughnut charts. Runs " +
      "estimate_costs automatically if not already cached.",
    inputSchema: zodToJsonSchema(open5dDashboardSchema),
  },
  {
    name: "export_ifc",
    description:
      "Export the session's footprint + height as a valid IFC2X3 building " +
      "model with perimeter walls and flat roof slab. Returns the IFC STEP " +
      "text inline (chat-friendly). Loads in BIMvision, BIMcollab Zoom, " +
      "Solibri, and Revit (import).",
    inputSchema: zodToJsonSchema(exportIfcSchema),
  },
];

server.setRequestHandler(ListToolsRequestSchema, async () => {
  sessionStore.gc();
  return { tools: TOOLS };
});

server.setRequestHandler(CallToolRequestSchema, async (req) => {
  const { name, arguments: args } = req.params;
  try {
    switch (name) {
      case "geocode":
        return toolResult(await geocode(args as never));
      case "fly_to_building": {
        const result = await flyToBuilding(args as never);
        return {
          content: [
            { type: "text", text: JSON.stringify(serialize(result), null, 2) },
            {
              type: "resource",
              resource: {
                uri: result.viewer_url,
                mimeType: "text/html",
                text: result.app_html,
              },
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
            { type: "text", text: JSON.stringify(serialize(result), null, 2) },
            {
              type: "resource",
              resource: {
                uri: result.dashboard_url,
                mimeType: "text/html",
                text: result.app_html,
              },
            },
          ],
        };
      }
      case "export_ifc": {
        const result = exportIfc(args as never);
        return {
          content: [
            {
              type: "text",
              text:
                `Exported ${result.filename} (${result.ifc_bytes} bytes).\n` +
                `Save the IFC payload below to a .ifc file and open in any IFC viewer.\n\n` +
                "```ifc\n" +
                result.ifc +
                "\n```",
            },
          ],
        };
      }
      default:
        return errorResult(`Unknown tool: ${name}`);
    }
  } catch (err) {
    return errorResult(err instanceof Error ? err.message : String(err));
  }
});

function toolResult(payload: unknown) {
  return {
    content: [{ type: "text" as const, text: JSON.stringify(serialize(payload), null, 2) }],
  };
}

function errorResult(message: string) {
  return {
    isError: true,
    content: [{ type: "text" as const, text: message }],
  };
}

/** Strip verbose embedded HTML so chat text stays readable. */
function serialize(obj: unknown): unknown {
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
      return {
        type: "array",
        items: zodToJsonSchema((schema as z.ZodArray<z.ZodTypeAny>).element),
      };
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

const transport = new StdioServerTransport();
await server.connect(transport);
// eslint-disable-next-line no-console
console.error("[allerion] mcp server ready on stdio (v0.0.2 - 5D enabled)");
