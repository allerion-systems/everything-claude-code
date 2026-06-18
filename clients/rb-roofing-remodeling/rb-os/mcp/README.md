# RB-OS MCP Server — the front door

One connection that exposes the [Allerion Agency](../agency/README.md) to any client R&B
employees use: Obsidian, Claude Desktop, or the R&B app. They ask in plain language; the
Agency routes to the right specialist.

## Tools exposed
| Tool | What it does |
| --- | --- |
| `list_applications` | Lists the lanes RB-OS covers and the model behind each |
| `ask_agency` | Sends a plain-language request; the Agency hires the right specialist and handles it |

## Setup
```sh
cd mcp
npm install
cp .env.example .env        # fill in keys + IDs (from agency/scripts/provision.sh)
npm run seed-brain          # loads ../brain/ into a memory store; prints RB_BRAIN_MEMORY_STORE_ID
npm run build
```

Prereq: provision the Agency first (`../agency/README.md`) to get
`RB_AGENCY_COORDINATOR_ID` and `RB_AGENCY_ENVIRONMENT_ID`.

## Connect a client (example: Claude Desktop)
Add to the client's MCP config:
```json
{
  "mcpServers": {
    "rb-os": {
      "command": "node",
      "args": ["/absolute/path/to/rb-os/mcp/dist/server.js"],
      "env": {
        "ANTHROPIC_API_KEY": "sk-ant-...",
        "RB_AGENCY_COORDINATOR_ID": "agent_...",
        "RB_AGENCY_ENVIRONMENT_ID": "env_...",
        "RB_BRAIN_MEMORY_STORE_ID": "memstore_..."
      }
    }
  }
}
```
Then an employee can simply say: *"A new lead just called about a roof leak on Bardstown Rd —
get them an instant estimate and book an inspection."* The Agency takes it from there.

## How it works
```
client → ask_agency → Agency.ask()
  → sessions.create(agent = coordinator, env, resources = [Brain memory store])
  → stream-first, send the request, drain to terminal idle
  → coordinator routes to a specialist → result returned to the client
```
Code: `src/server.ts` (tools) · `src/agency.ts` (Managed Agents client) · `src/applications.ts`.

## Notes
- The server only ever creates **sessions** — the coordinator agent is created once during
  provisioning and reused by ID (the correct setup/runtime split).
- The Brain (`../brain/`) is mounted as a shared memory store so every specialist has context.
- This is a working scaffold; per-lane integrations (CRM, calendar, payments) are wired on the
  agents as MCP servers with vault-stored credentials — see `../agency/README.md`.
