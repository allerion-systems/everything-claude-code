# R&B Operating System (RB-OS)

**The single, simple surface every R&B employee uses to run the business.**
Built by Allerion Systems for R&B Roofing & Remodeling (Louisville, KY).

> One idea: an employee shouldn't have to learn ten apps. They ask RB-OS in plain
> language; behind the scenes a hosted **Agency** assigns the right specialist agent to the
> right application and gets it done. The **Brain** is the shared memory that keeps every
> agent — and every employee — on the same page.

---

## The three layers

```
        ┌─────────────────────────────────────────────────────────────┐
        │  R&B EMPLOYEES                                                │
        │  Obsidian (the Brain) · Claude Desktop · R&B web app · phone │
        └───────────────────────────┬─────────────────────────────────┘
                                     │  plain-language requests
                                     ▼
        ┌─────────────────────────────────────────────────────────────┐
        │  1. MCP SERVER  (the front door)        rb-os/mcp/           │
        │     One connection. Exposes the Agency as a handful of       │
        │     simple tools any client can call.                        │
        └───────────────────────────┬─────────────────────────────────┘
                                     │
                                     ▼
        ┌─────────────────────────────────────────────────────────────┐
        │  2. THE AGENCY  (hosted by Allerion)    rb-os/agency/        │
        │     A coordinator that "hires" one specialist agent per      │
        │     application and delegates the work.                       │
        │                                                              │
        │     coordinator ─┬─ Intake agent     ─┬─ Billing agent       │
        │                  ├─ Triage agent      ├─ Retention agent     │
        │                  ├─ Estimator agent   ├─ Scheduler agent     │
        │                  ├─ Proposals agent   └─ Jobs agent          │
        │                  └─ Dashboard agent                          │
        └───────────────────────────┬─────────────────────────────────┘
                                     │  read / write shared knowledge
                                     ▼
        ┌─────────────────────────────────────────────────────────────┐
        │  3. THE BRAIN  (Obsidian vault + graph)  rb-os/brain/        │
        │     Interlinked notes: company, applications, agents,        │
        │     concepts, people. Open in Obsidian for the graph view.   │
        │     The agents read it for context and write learnings back. │
        └─────────────────────────────────────────────────────────────┘
```

| Layer | Folder | What it is | How it's built |
| --- | --- | --- | --- |
| **Brain** | `brain/` | Obsidian vault of interlinked Markdown — the shared knowledge graph | `[[wikilinks]]` + a graph hub (`00-Index`) |
| **Agency** | `agency/` | Coordinator + per-application specialist agents, hosted by Allerion | Claude **Managed Agents** (coordinator roster) |
| **MCP** | `mcp/` | The one front-door connection clients use | MCP server (TypeScript) routing to the Agency |

---

## Why it's simple for R&B employees

- **One door, plain language.** "Give the Johnson job a final estimate and send the proposal."
  The employee never picks an app — the Agency routes it.
- **One agent per application.** Each specialist owns its lane (see `agency/agents/`), so
  answers are consistent and accountable.
- **One memory.** Every agent reads and writes the same Brain, so context never gets lost
  between people, apps, or jobs.

---

## The applications (each gets its own agent)

These mirror the pipeline from `../automation-audit.md`. Each has a Brain note in
`brain/Applications/` and a hired agent in `agency/agents/`.

**Hybrid brain** (per [ADR-001](ADR-001-orchestration-and-hybrid-brain.md)): GPT runs the
customer-facing lanes; Claude runs the reasoning lanes. The **Estimator** is now a trio —
Roofr (measure) → Hover (design) → **Handoff.ai (Chief Estimator, prices it)**. Full map:
[`agency/lanes.yaml`](agency/lanes.yaml).

| Application | Owns | Brain | Connectors |
| --- | --- | --- | --- |
| Intake | lead capture + instant 24/7 response | OpenAI (GPT) | M365 Outlook, web, SMS |
| Triage | classify / route | Claude Haiku 4.5 | M365 |
| Estimator (Roofr) | aerial measurement | Claude Haiku 4.5 | Roofr |
| Estimator (Hover) | 3D design + takeoffs | Claude Haiku 4.5 | Hover |
| Estimator (Handoff.ai) | **Chief Estimator — pricing** | Claude Opus 4.8 | Handoff.ai, QuickBooks |
| Proposals | tiered proposal + e-sign + follow-up | Claude Opus 4.8 | M365, e-sign, QuickBooks |
| Scheduler | booking, reminders, reschedules | OpenAI (GPT) | M365 Calendar, Teams |
| Jobs | status hub, homeowner updates | OpenAI (GPT) | Teams, SharePoint, OneDrive |
| Billing | invoices, payment links, dunning | Claude Haiku 4.5 | QuickBooks (+ Stripe) |
| Retention | reviews, referrals, maintenance | OpenAI (GPT) | M365 Outlook, SMS |
| Dashboard | owner metrics + reporting | Claude Sonnet 4.6 | Excel/Power BI, QuickBooks |

Stack rationale: [`stack-revision-2026-06.md`](stack-revision-2026-06.md). Off JobNimbus;
standardized on ChatGPT + Microsoft 365 + QuickBooks + Roofr/Hover/Handoff.ai.

---

## Doors (how employees reach it)

- **ChatGPT** (`chatgpt/`) — the primary door: a custom "R&B Operations" GPT calling the Agency.
- **MCP server** (`mcp/`) — for Obsidian, the R&B app, Claude Desktop.
- **Teams** — via the same Agency API (M365).

All three call one Agency API ([`chatgpt/rb-os-actions.openapi.yaml`](chatgpt/rb-os-actions.openapi.yaml)).

## Build status & next steps

Scaffold + stack revision complete. To bring it live:

1. **Brain** — open `brain/` as an Obsidian vault; the graph renders immediately.
2. **Agency (Claude lanes)** — `bash agency/scripts/provision.sh` (needs `ANTHROPIC_API_KEY`).
3. **Agency (GPT lanes)** — create OpenAI assistants from `agency/openai/assistants.yaml`.
4. **ChatGPT door** — build the GPT from `chatgpt/` (instructions + Action).
5. **MCP door** — `cd mcp && npm install && npm run seed-brain && npm run build`.

Decisions: [ADR-001](ADR-001-orchestration-and-hybrid-brain.md). Stack: [stack-revision](stack-revision-2026-06.md).
Open dependencies (pricing catalog ownership, Roofr/Hover/Handoff API access, M365/ChatGPT admin,
branding) are tracked in the stack revision §8 and confirmed on the scheduled audit call.
