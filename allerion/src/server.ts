#!/usr/bin/env node
// Allerion MCP server. Exposes geocode, fly_to_building, measure, and export_ifc
// tools over stdio - the standard transport for Claude Desktop, Cursor, and
// VS Code MCP. The viewer HTML is served separately by static-server.ts.

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
import { sessionStore } from "./lib/session-store.js";

const server = new Server(
  { name: "allerion", version: "0.0.1" },
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
      "or OSM Buildings extrusions. The returned session_id is used by " +
      "measure and export_ifc.",
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
    name: "export_ifc",
    description:
      "Export the session's last polygon footprint + vertical height as a " +
      "valid IFC2X3 building model with perimeter walls and flat roof slab. " +
      "Returns the IFC STEP text inline (chat-friendly).",
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
      case "geocode": {
        const result = await geocode(args as never);
        return toolResult(result);
      }
      case "fly_to_building": {
        const result = await flyToBuilding(args as never);
        // MCP Apps spec: include the HTML in a structured resource so clients
        // that support inline rendering pick it up automatically.
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
      case "measure": {
        const result = measure(args as never);
        return toolResult(result);
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

/** Strip the verbose app_html field from text output so chats stay readable. */
function serialize(obj: unknown): unknown {
  if (obj && typeof obj === "object" && "app_html" in obj) {
    const { app_html: _omit, ...rest } = obj as Record<string, unknown>;
    return rest;
  }
  return obj;
}

/**
 * Tiny Zod -> JSON schema converter covering exactly the shapes we use.
 * Avoids pulling in zod-to-json-schema for a project this small.
 */
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
    default:
      return {};
  }
}

const transport = new StdioServerTransport();
await server.connect(transport);
// eslint-disable-next-line no-console
console.error("[allerion] mcp server ready on stdio");
