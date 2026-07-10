#!/usr/bin/env node
// Science MCP server entrypoint — connects the server over stdio.

import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { createServer, SERVER_NAME, SERVER_VERSION } from "./server.js";

async function main() {
  const server = createServer();
  const transport = new StdioServerTransport();
  await server.connect(transport);
  // Never write to stdout — it is the JSON-RPC channel. Log to stderr only.
  process.stderr.write(`${SERVER_NAME} v${SERVER_VERSION} ready (stdio)\n`);
}

main().catch((error) => {
  process.stderr.write(`Fatal: ${error instanceof Error ? error.stack || error.message : String(error)}\n`);
  process.exit(1);
});
