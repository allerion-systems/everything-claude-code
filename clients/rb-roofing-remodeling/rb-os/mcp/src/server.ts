#!/usr/bin/env node
/**
 * RB-OS MCP server — the single front door.
 *
 * R&B employees' tools (Obsidian, Claude Desktop, the R&B app) connect here. The server
 * exposes the Allerion Agency as a couple of simple tools; the Agency coordinator then
 * hires the right specialist per application. One connection, plain language, no app-picking.
 */
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { Agency } from "./agency.js";
import { APPLICATIONS } from "./applications.js";

const coordinatorId = process.env.RB_AGENCY_COORDINATOR_ID;
const environmentId = process.env.RB_AGENCY_ENVIRONMENT_ID;
const brainMemoryStoreId = process.env.RB_BRAIN_MEMORY_STORE_ID;

if (!coordinatorId || !environmentId) {
  console.error(
    "Missing RB_AGENCY_COORDINATOR_ID / RB_AGENCY_ENVIRONMENT_ID. " +
      "Run agency/scripts/provision.sh and copy the IDs into mcp/.env (see .env.example).",
  );
  process.exit(1);
}

const agency = new Agency({ coordinatorId, environmentId, brainMemoryStoreId });

const server = new McpServer({ name: "rb-os", version: "0.1.0" });

// Tool 1 — discover what the OS can do.
server.registerTool(
  "list_applications",
  {
    title: "List R&B applications",
    description:
      "List the applications RB-OS covers (the lanes the Agency routes to) and which model runs each.",
    inputSchema: {},
  },
  async () => ({
    content: [
      {
        type: "text",
        text: APPLICATIONS.map((a) => `• ${a.name} — ${a.owns} (${a.model})`).join("\n"),
      },
    ],
  }),
);

// Tool 2 — the front door. Ask in plain language; the Agency routes and acts.
server.registerTool(
  "ask_agency",
  {
    title: "Ask the Allerion Agency",
    description:
      "Send a plain-language request to R&B's operating system. The Agency picks the right " +
      "specialist (Intake, Triage, Estimator, Proposals, Scheduler, Jobs, Billing, Retention, " +
      "Dashboard) and handles it. Example: 'Give the Johnson roof an estimate and send a proposal.'",
    inputSchema: {
      request: z.string().describe("What the employee wants, in plain language."),
    },
  },
  async ({ request }) => {
    try {
      const reply = await agency.ask(request);
      return { content: [{ type: "text", text: reply }] };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      return { content: [{ type: "text", text: `Agency error: ${msg}` }], isError: true };
    }
  },
);

const transport = new StdioServerTransport();
await server.connect(transport);
console.error("RB-OS MCP server running on stdio.");
