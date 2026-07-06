# MCP Servers

Self-contained stdio MCP servers you can add to **any Claude Code workspace** with one command.

## Setup (once per machine)

```bash
cd <this-repo>/mcp-servers/hover && npm install
cd <this-repo>/mcp-servers/handoff && npm install
```

## HOVER (hover.to) - property measurements & 3D models

Official API: https://developers.hover.to (OAuth 2.0).

```bash
# with a ready access token:
claude mcp add hover -e HOVER_ACCESS_TOKEN=<token> -- node <this-repo>/mcp-servers/hover/index.js

# or with auto-refreshing credentials:
claude mcp add hover \
  -e HOVER_CLIENT_ID=<id> -e HOVER_CLIENT_SECRET=<secret> -e HOVER_REFRESH_TOKEN=<refresh> \
  -- node <this-repo>/mcp-servers/hover/index.js
```

Add `--scope user` to make it available in every workspace instead of just the current one.

Tools: `hover_list_jobs`, `hover_get_job`, `hover_get_measurements` (json inline; pdf/xlsx/**skp**/xml/esx/fml written to disk), `hover_create_capture_request`, `hover_list_capture_requests`, `hover_get_wireframe_images`, `hover_raw_request` (any endpoint incl. webhooks and `/test_jobs/*` sandbox).

Notes:
- `hover_get_measurements format=skp` downloads the SketchUp model of a captured property - pairs directly with the `sketchup-cloud-modeling` skill / File → Insert workflow.
- Org-level OAuth job creation needs `params[current_user_email]` or 422s (use `hover_raw_request`).

## Handoff (handoff.ai) - construction estimating

**Handoff has no public API as of 2026-07** ([their help center](https://help.handoff.ai/en/articles/9778505-does-handoff-have-an-api)). This server is an honest scaffold: `handoff_status` reports the situation, and the generic `handoff_request` tool goes live the moment you obtain partner/private API credentials from Handoff.

```bash
claude mcp add handoff -- node <this-repo>/mcp-servers/handoff/index.js

# when Handoff grants API access:
claude mcp add handoff \
  -e HANDOFF_API_BASE=https://<their-api-base> -e HANDOFF_API_KEY=<key> \
  -- node <this-repo>/mcp-servers/handoff/index.js
```

Until then, move estimates in/out of Handoff via the app's exports (PDF/CSV) and let Claude parse them.

## Security

- Credentials are passed as env vars via `claude mcp add -e ...`; they live in your local Claude config, never in this repo. Do not commit tokens.
