#!/usr/bin/env node
// Single entrypoint for the Allerion MCP server. Pick a transport via the
// first arg. Defaults to stdio (matches how Claude Desktop / Cursor / VS Code
// MCP launch us).
//
//   allerion              # stdio (for local MCP clients)
//   allerion stdio        # explicit stdio
//   allerion http         # Streamable HTTP on :8788/mcp (for Claude Apps / marketplace)
//   allerion viewer       # the static viewer + dashboard server on :8787
//   allerion all          # http + viewer (typical hosted deployment)

const mode = (process.argv[2] ?? "stdio").toLowerCase();

async function main() {
  switch (mode) {
    case "stdio":
      await import("./server.js");
      break;
    case "http":
      await import("./http-server.js");
      break;
    case "viewer":
      await import("./static-server.js");
      break;
    case "all":
      await Promise.all([import("./http-server.js"), import("./static-server.js")]);
      break;
    default:
      // eslint-disable-next-line no-console
      console.error(`Unknown mode: ${mode}. Use: stdio | http | viewer | all`);
      process.exit(1);
  }
}

main();
