# The Agency — hosted by Allerion

The coordinator that **hires one specialist agent per application** and delegates work, so it's
simple for R&B employees. Built on **Claude Managed Agents** (a coordinator with a roster of
sub-agents). See `../brain/Agents/Allerion Agency.md` for the conceptual view.

## Layout
```
agency/
  coordinator.agent.yaml   ← the router (Opus 4.8), holds the roster
  environment.yaml         ← shared cloud environment for all agents
  agents/                  ← one specialist per application
    intake.agent.yaml      (Haiku 4.5)   triage.agent.yaml    (Haiku 4.5)
    estimator.agent.yaml   (Opus 4.8)    proposals.agent.yaml (Opus 4.8)
    scheduler.agent.yaml   (Sonnet 4.6)  jobs.agent.yaml      (Sonnet 4.6)
    billing.agent.yaml     (Haiku 4.5)   retention.agent.yaml (Haiku 4.5)
    dashboard.agent.yaml   (Sonnet 4.6)
```
Model choices follow `../../whitelabel-ai-blueprint.md` §4: cheap/fast **Haiku 4.5** for
high-volume lanes, **Opus 4.8** for reasoning-heavy lanes and the coordinator, **Sonnet 4.6**
for the balanced middle.

## Provision (one-time setup)

Prereqs: an `ANTHROPIC_API_KEY`, and the Anthropic CLI (`ant`) or SDK. Agents are persistent —
create once, reuse by ID. (Setup script: `scripts/provision.sh`.)

```sh
export ANTHROPIC_API_KEY=sk-ant-...

# 1. Environment
ENV_ID=$(ant beta:environments create < agency/environment.yaml --transform id -r)

# 2. Specialists — capture each ID
for f in agency/agents/*.agent.yaml; do
  id=$(ant beta:agents create < "$f" --transform id -r)
  echo "$f -> $id"
done

# 3. Edit agency/coordinator.agent.yaml: replace the agent_REPLACE_* placeholders in
#    multiagent.agents with the IDs from step 2. Then:
COORD_ID=$(ant beta:agents create < agency/coordinator.agent.yaml --transform id -r)
echo "Coordinator: $COORD_ID   Environment: $ENV_ID"
```

Store `COORD_ID` and `ENV_ID` — the MCP server (`../mcp/`) uses them to start sessions.

## How a request flows
```
employee → MCP server → sessions.create(agent=COORD_ID, env=ENV_ID)
        → coordinator routes → specialist does the work (reads/writes the Brain)
        → result streams back to the employee
```

## Connecting integrations (per lane)
Each specialist's lane maps to real connectors (confirm exact accounts on the audit):

| Specialist | Connects to |
| --- | --- |
| Intake | Gmail / Outlook, web form, SMS, webhooks |
| Triage | JobNimbus, Roofr |
| Estimator | Roofr, aerial-imagery provider |
| Proposals | Google Docs / Gamma, e-sign, QuickBooks (estimate) |
| Scheduler | Google / Outlook Calendar |
| Jobs | JobNimbus, Google Drive |
| Billing | QuickBooks (`create_invoice`, `create_payment_link`), Stripe |
| Retention | Gmail, SMS |
| Dashboard | Google Sheets, QuickBooks reports |

Wire these as MCP servers on each agent (`mcp_servers` in the YAML) with credentials stored in
a **vault** at session time — never in the agent definition. See
`../../whitelabel-ai-blueprint.md` §6 (security) and the audit's tool-inventory items.

## Shared memory (the Brain)
Seed `../brain/` into a memory store, then every session shares it:
```sh
cd ../mcp && npm install && npm run seed-brain   # prints RB_BRAIN_MEMORY_STORE_ID
```
Put that ID in `mcp/.env`; the MCP server attaches it to every session it creates, so all
specialists read and write the same context.

## Connecting integrations (now wired)
Each specialist YAML in `agents/` already declares its lane's connectors under `mcp_servers`
(+ matching `mcp_toolset` entries). The URLs are **placeholders flagged `[CONFIRM]`** — replace
them with R&B's real hosted MCP endpoints (native vendor MCP, or a Zapier MCP aggregator).
**Credentials are never in the YAML** — store them in a vault and pass `vault_ids` at session
time (the MCP server does this once configured). See `../../whitelabel-ai-blueprint.md` §6.
