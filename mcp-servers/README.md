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

## Handoff (handoff.ai) - AI construction estimating

Wraps the **Handoff Enterprise API** (docs: https://api.handoff.ai/docs). Auth is OAuth2
client-credentials: get your **Client ID** (UUID) and **Client Secret** (`hnd_...`) from
`app.handoff.ai/settings/integrations?tab=api-keys`. Token fetch + refresh is automatic.

```bash
claude mcp add handoff \
  -e HANDOFF_CLIENT_ID=<uuid> -e HANDOFF_CLIENT_SECRET=<hnd_key> \
  -- node <this-repo>/mcp-servers/handoff/index.js
```

Tools: `handoff_status` (live credential check), `handoff_create_estimate` (BLUEPRINT from
plan files or MATERIAL_LIST from a prompt - local files are auto-uploaded via presigned
URLs; supports address-based regional pricing), `handoff_get_estimate` (poll job),
`handoff_update_estimate`, `handoff_match_materials`, `handoff_get_presets` /
`handoff_set_presets`, `handoff_raw_request` (webhook config etc.).

Scopes available: `estimates:read estimates:write materials:create blueprints:create
presets:manage files:manage data:delete webhooks:manage`.

## Security

- Credentials are passed as env vars via `claude mcp add -e ...`; they live in your local Claude config, never in this repo. Do not commit tokens.
