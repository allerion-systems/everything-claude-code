#!/usr/bin/env node
// Allerion MCP server - stdio transport. The standard way Claude Desktop,
// Cursor, and VS Code MCP connect. For Claude Apps / marketplace deployment,
// see http-server.ts.

import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { createMcpServer } from "./lib/mcp-server.js";

const server = createMcpServer();
const transport = new StdioServerTransport();
await server.connect(transport);
// eslint-disable-next-line no-console
console.error("[allerion] mcp server ready on stdio");
