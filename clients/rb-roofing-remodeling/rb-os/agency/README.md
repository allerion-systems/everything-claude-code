# The Agency — hosted by Allerion (hybrid brain)

The orchestration core that runs R&B's lead→cash workflow and routes each request to the right
specialist. Per **ADR-001**, it's a **hybrid**: GPT powers the customer-facing/conversational
lanes; Claude powers the reasoning-heavy lanes. Employees reach it through **ChatGPT** (`../chatgpt/`),
the **MCP server** (`../mcp/`), and Teams — one platform, many doors.

Source of truth for every lane (provider, model, role, connectors): **`lanes.yaml`**.

## Layout
```
agency/
  lanes.yaml               ← the lane map (all lanes, both providers) — source of truth
  coordinator.agent.yaml   ← Claude-side coordinator (rosters the Claude lanes)
  environment.yaml         ← shared cloud environment for the Claude agents
  agents/                  ← CLAUDE lanes (Managed Agents)
    triage · roofr · hover · handoff · proposals · billing · dashboard
  openai/
    assistants.yaml        ← GPT lanes (OpenAI assistants): intake · scheduler · jobs · retention
  scripts/provision.sh     ← one-time setup for the Claude side
```

## The estimating trio (the headline)
`roofr` (measure) → `hover` (design) → **`handoff` (Chief Estimator, prices it)**. The Chief
Estimator owns the number; it's the lane Allerion's future in-house instant estimator replaces.

## Hybrid model map (from `lanes.yaml`)
| Lane | Brain |
| --- | --- |
| Intake, Scheduler, Jobs, Retention | **OpenAI (GPT)** — customer-facing conversation |
| Triage, Roofr, Hover, Billing | **Claude Haiku 4.5** — cheap, high-volume |
| Handoff.ai (Chief Estimator), Proposals | **Claude Opus 4.8** — heavy reasoning |
| Dashboard | **Claude Sonnet 4.6** |

## Provision

**Claude lanes** (needs `ANTHROPIC_API_KEY` + the `ant` CLI):
```sh
bash agency/scripts/provision.sh   # creates env + Claude agents + coordinator; prints the IDs
```

**GPT lanes** (needs R&B's OpenAI key): create one OpenAI assistant per entry in
`openai/assistants.yaml`, using the model R&B sets on their account. [CONFIRM model]

**Agency backend:** the service that reads `lanes.yaml`, exposes the API in
`../chatgpt/rb-os-actions.openapi.yaml`, and dispatches to the Claude coordinator or the OpenAI
assistants per lane. (The `../mcp/` server is a thin adapter to this same API.)

## Integrations & secrets
Each lane's connectors are declared in `lanes.yaml` (and on the Claude agents' `mcp_servers`).
URLs are `[CONFIRM]` placeholders; **credentials live in a vault** (Claude) or the OpenAI/secret
store (GPT) and are attached at runtime — never in these files. Connectors: M365 (Graph), QuickBooks,
Roofr, Hover, Handoff.ai, e-sign, Stripe (optional).

## Shared memory (the Brain)
Seed `../brain/` into a memory store so every lane shares context:
```sh
cd ../mcp && npm install && npm run seed-brain   # prints RB_BRAIN_MEMORY_STORE_ID
```
Claude lanes mount it as a memory store; GPT lanes read it via the Agency backend.
