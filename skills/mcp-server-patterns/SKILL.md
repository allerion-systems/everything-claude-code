---
name: mcp-server-patterns
description: Build MCP servers with Node/TypeScript SDK — tools, resources, prompts, Zod validation, stdio vs Streamable HTTP. Use Context7 or official MCP docs for latest API.
origin: ECC
---

# MCP Server Patterns

The Model Context Protocol (MCP) lets AI assistants call tools, read resources, and use prompts from your server. Use this skill when building or maintaining MCP servers. The SDK API evolves; check Context7 (query-docs for "MCP") or the official MCP documentation for current method names and signatures.

## When to Use

Use when: implementing a new MCP server, adding tools or resources, choosing stdio vs HTTP, upgrading the SDK, or debugging MCP registration and transport issues.

## How It Works

### Core concepts

- **Tools**: Actions the model can invoke (e.g. search, run a command). Register with `registerTool()` or `tool()` depending on SDK version.
- **Resources**: Read-only data the model can fetch (e.g. file contents, API responses). Register with `registerResource()` or `resource()`. Handlers typically receive a `uri` argument.
- **Prompts**: Reusable, parameterised prompt templates the client can surface (e.g. in Claude Desktop). Register with `registerPrompt()` or equivalent.
- **Transport**: stdio for local clients (e.g. Claude Desktop); Streamable HTTP is preferred for remote (Cursor, cloud). Legacy HTTP/SSE is for backward compatibility.

The Node/TypeScript SDK may expose `tool()` / `resource()` or `registerTool()` / `registerResource()`; the official SDK has changed over time. Always verify against the current [MCP docs](https://modelcontextprotocol.io) or Context7.

### Connecting with stdio

For local clients, create a stdio transport and pass it to your server’s connect method. The exact API varies by SDK version (e.g. constructor vs factory). See the official MCP documentation or query Context7 for "MCP stdio server" for the current pattern.

Keep server logic (tools + resources) independent of transport so you can plug in stdio or HTTP in the entrypoint.

### Remote (Streamable HTTP)

For Cursor, cloud, or other remote clients, use **Streamable HTTP** (single MCP HTTP endpoint per current spec). Support legacy HTTP/SSE only when backward compatibility is required.

## Examples

### Install and server setup

```bash
npm install @modelcontextprotocol/sdk zod
```

```typescript
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

const server = new McpServer({ name: "my-server", version: "1.0.0" });
```

Register tools and resources using the API your SDK version provides: some versions use `server.tool(name, description, schema, handler)` (positional args), others use `server.tool({ name, description, inputSchema }, handler)` or `registerTool()`. Same for resources — include a `uri` in the handler when the API provides it. Check the official MCP docs or Context7 for the current `@modelcontextprotocol/sdk` signatures to avoid copy-paste errors.

Use **Zod** (or the SDK’s preferred schema format) for input validation.

## Best Practices

- **Schema first**: Define input schemas for every tool; document parameters and return shape.
- **Errors**: Return structured errors or messages the model can interpret; avoid raw stack traces.
- **Idempotency**: Prefer idempotent tools where possible so retries are safe.
- **Rate and cost**: For tools that call external APIs, consider rate limits and cost; document in the tool description.
- **Versioning**: Pin SDK version in package.json; check release notes when upgrading.

## Debugging

- **MCP Inspector**: interactive, transport-agnostic testing UI. Connect to a stdio or Streamable HTTP server, invoke tools/prompts/resources, and watch the notification stream. Start here before testing against a real client.
- **Logging**:
  - stdio transport: write logs to **stderr**, never stdout — stdout is reserved for protocol messages and writing to it will break the connection.
  - Streamable HTTP transport: stderr isn't captured by the client. Send `notifications/message` log messages instead (`server.sendLoggingMessage({ level, data })` in TS, `ctx.session.send_log_message(...)` in Python), or rely on your own server-side log aggregation and standard HTTP tooling (curl, browser DevTools Network panel).
  - Log initialization steps, resource access, tool execution, error conditions, and performance metrics.
- **Common failure points**:
  - *Working directory*: clients may launch stdio servers from an undefined cwd (e.g. `/` on macOS). Always use absolute paths in server config and `.env` files.
  - *Environment variables*: stdio servers inherit only a limited, platform-dependent subset of env vars. Pass required vars explicitly via the client's `env` config key.
  - *Initialization*: verify the server executable path, check for valid JSON config, and confirm required env vars are set and correctly valued.
  - *Connection problems*: check client logs, confirm the server process is actually running, test standalone with Inspector, and verify protocol/capability negotiation — a `-32602` "Invalid params" error is often a server sending a `sampling` or `elicitation` request to a client that never declared that capability.
- **Claude Desktop specifics**: connector/tool status is under the "Add files, connectors, and more" menu; logs live at `~/Library/Logs/Claude/mcp*.log` (macOS) or `%APPDATA%\Claude\logs` (Windows); Chrome DevTools can be enabled via `developer_settings.json` (`{"allowDevTools": true}`) for inspecting client-side errors and network payloads.
- **Iterating**: config changes and server code changes both require a full client restart (fully quit and reopen, not just closing the window); use Inspector for fast iteration during development.

## Official SDKs and Docs

- **JavaScript/TypeScript**: `@modelcontextprotocol/sdk` (npm). Use Context7 with library name "MCP" for current registration and transport patterns.
- **Go**: Official Go SDK on GitHub (`modelcontextprotocol/go-sdk`).
- **C#**: Official C# SDK for .NET.
