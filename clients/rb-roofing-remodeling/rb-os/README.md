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

| Application | Owns | Agent model |
| --- | --- | --- |
| Intake | unified lead capture + instant 24/7 response | Haiku 4.5 |
| Triage | classify / score / dedupe / route | Haiku 4.5 |
| Estimator | satellite measurement → AI estimate | Opus 4.8 |
| Proposals | tiered branded PDF + e-sign + follow-up | Opus 4.8 |
| Scheduler | booking, reminders, weather reschedules | Sonnet 4.6 |
| Jobs | status hub, homeowner updates, materials | Sonnet 4.6 |
| Billing | invoices, payment links, dunning | Haiku 4.5 |
| Retention | reviews, referrals, maintenance | Haiku 4.5 |
| Dashboard | owner metrics + reporting | Sonnet 4.6 |

Model assignment follows the strategy in `../whitelabel-ai-blueprint.md` §4 (cheap/fast model
for high-volume lanes, Opus 4.8 for the reasoning-heavy ones, coordinator on Opus 4.8).

---

## Build status & next steps

This is the **scaffold** — architecture, the Brain vault, the Agency agent configs, and the
MCP server skeleton. To bring it live:

1. **Brain** — open `brain/` as an Obsidian vault; the graph renders immediately.
2. **Agency** — provision the agents from `agency/*.yaml` via the Anthropic CLI / SDK
   (see `agency/README.md`). Requires an `ANTHROPIC_API_KEY`.
3. **MCP** — `cd mcp && npm install && npm run build`; point Claude Desktop / clients at it
   (see `mcp/README.md`). Requires the agency wiring + key.

Open dependencies (priced catalog, aerial-imagery provider, tool integrations, branding) are
tracked in `../whitelabel-ai-blueprint.md` §8 and confirmed on the scheduled audit call.
