# ADR-001: Orchestration model + hybrid AI brain

**Status:** Accepted (2026-06) · **Supersedes** the single-provider assumption in earlier RB-OS docs.

## Decisions

1. **Orchestration = Agency core + ChatGPT front-end.**
   A provider-agnostic **Agency** backend (hosted by Allerion) runs the lead→cash workflow and
   fans out to the tools (Roofr, Hover, Handoff.ai, QuickBooks, Microsoft 365). R&B employees
   reach it primarily through **ChatGPT** (a custom GPT calling the Agency via Actions), and also
   through the **MCP server** (Obsidian, the R&B app) and **Teams**. One platform, many doors.

2. **AI brain = hybrid, best-per-lane.**
   - **OpenAI (GPT)** powers the **customer-facing / conversational** lanes (Intake, Scheduler,
     Jobs, Retention) and the ChatGPT front door itself.
   - **Claude** powers the **reasoning-heavy** lanes — the **Chief Estimator (Handoff.ai)**,
     **Proposals**, **Dashboard**, plus the cheap high-volume internal lanes (Triage, Roofr,
     Hover, Billing) on Haiku.

## Why

- "One integrated platform with ChatGPT" → ChatGPT is the door employees love; the Agency is the
  durable brain that survives tool swaps (e.g., when Allerion's in-house instant estimator
  replaces Roofr+Handoff). No AI-vendor lock-in: any lane's model can change without touching the
  others.
- Hybrid plays each provider to its strength: GPT for natural customer conversation inside R&B's
  ChatGPT account; Claude for the estimating/proposal reasoning where quality moves money.

## The lane map (source of truth: `agency/lanes.yaml`)

| Lane | Provider / model | Role | Primary connectors |
| --- | --- | --- | --- |
| **Router (ChatGPT)** | OpenAI (GPT) | Front-door routing for ChatGPT users | → Agency Actions |
| **Router (backend)** | Claude Opus 4.8 | Routing for MCP / app clients | → lanes |
| Intake | OpenAI (GPT) | Customer-facing capture + instant response | M365 Outlook, web, SMS |
| Triage | Claude Haiku 4.5 | Classify / score / route | M365 |
| **Roofr** | Claude Haiku 4.5 | Aerial Measurement Reporter | Roofr |
| **Hover** | Claude Haiku 4.5 | Design Agent (3D, takeoffs) | Hover |
| **Handoff.ai** | **Claude Opus 4.8** | **Chief Estimator (pricing)** | Handoff.ai, QuickBooks |
| Proposals | Claude Opus 4.8 | Draft + e-sign + follow-up | M365 (Word/SharePoint), e-sign, QuickBooks |
| Scheduler | OpenAI (GPT) | Conversational booking | M365 Outlook Calendar / Teams |
| Jobs | OpenAI (GPT) | Status hub + homeowner updates | M365 Teams / SharePoint / OneDrive |
| Billing | Claude Haiku 4.5 | Invoices / payment links / dunning | QuickBooks (+ Stripe optional) |
| Retention | OpenAI (GPT) | Reviews / referrals / maintenance | M365 Outlook, SMS |
| Dashboard | Claude Sonnet 4.6 | Metrics / reporting | Excel / Power BI, QuickBooks |

> Claude model IDs are exact (`claude-opus-4-8`, `claude-sonnet-4-6`, `claude-haiku-4-5`). The
> GPT model is whatever R&B sets in their OpenAI/ChatGPT account — **[CONFIRM]**; I won't hard-code
> an OpenAI model string here.

## Consequences

- **Claude lanes** are provisioned as Claude Managed Agents (`agency/agents/*.agent.yaml`).
- **GPT lanes** are provisioned as OpenAI assistants/GPTs (`agency/openai/`).
- The **Agency backend** holds the unified API both fronts call, owns the workflow + shared Brain,
  and routes to whichever provider a lane uses — so adding/swapping a lane is a config change in
  `agency/lanes.yaml`, not a rewrite.
- The **Estimator** application is now the **Roofr → Hover → Handoff.ai** trio (see
  `stack-revision-2026-06.md` §2).
