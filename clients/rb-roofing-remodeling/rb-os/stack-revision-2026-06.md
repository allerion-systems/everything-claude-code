# RB-OS Stack Revision — June 2026

**What changed:** R&B is moving off JobNimbus and standardizing on **ChatGPT + Microsoft 365 +
QuickBooks + Roofr** now, with **Handoff.ai** and **Hover** as the estimating/design brains —
until Allerion builds R&B a better in-house instant estimator. This doc re-points RB-OS at that
stack. It supersedes the connector choices in `whitelabel-ai-blueprint.md` §4–5 and
`automation-audit.md` §5 (which referenced JobNimbus / Google).

> Brainstorm status — directional. The one decision that changes the build (where orchestration
> lives) is at the bottom; vendor integration surfaces are tagged **[CONFIRM]**.

---

## 1. The new canonical stack

| Layer | Tool | Role |
| --- | --- | --- |
| Conversation / front door | **ChatGPT** (R&B business account) | Where employees ask in plain language |
| System of record + comms | **Microsoft 365** | Outlook (mail/calendar), Teams, SharePoint/OneDrive (files), Excel (reporting) |
| Accounting / payments | **QuickBooks** | Estimates → invoices → payment links, financials |
| Aerial measurement | **Roofr** | Satellite/aerial roof measurement reports |
| Design / 3D | **Hover** | Photos → 3D model, exterior design, material takeoffs |
| Estimating | **Handoff.ai** | Chief Estimator — measurements + scope → priced estimate & proposal |
| Future | **RB Instant Estimator** (Allerion-built) | Eventually replaces Roofr+Handoff for instant estimates |

**Dropped:** JobNimbus (CRM). Its jobs are absorbed by ChatGPT (intake/conversation), M365
(records/comms), and Handoff.ai (estimating/pipeline).

---

## 2. The estimating trio (assembly line)

The old single "Estimator" application becomes three specialists, with Handoff.ai as the lead:

```
   address / photos
        │
        ▼
  ┌───────────┐   measurements   ┌──────────────┐   the number   ┌──────────┐
  │  Roofr    │ ───────────────▶ │  Handoff.ai  │ ─────────────▶ │ Proposal │
  │  agent    │                  │  CHIEF       │                │  (M365 / │
  │ (measure) │   design+takeoff │  ESTIMATOR   │                │  e-sign) │
  └───────────┘ ┌──────────────▶ │  (price)     │                └──────────┘
                │                 └──────────────┘
          ┌──────────┐
          │  Hover   │
          │  agent   │
          │ (design) │
          └──────────┘
```

- **Roofr agent — Aerial Measurement Reporter:** orders/pulls the measurement report; outputs
  roof area, facets, pitch, edges. Hands measurements to the Chief Estimator.
- **Hover agent — Design Agent:** photos → 3D model + exterior design + siding/material takeoffs;
  great for remodels and homeowner buy-in. Hands design + takeoffs to the Chief Estimator.
- **Handoff.ai agent — Chief Estimator:** combines measurements + design + R&B's pricing catalog
  → the estimate and proposal line items. Owns "the number." This is the lane Allerion's future
  instant estimator slots into.

---

## 3. Revised application → tool mapping

| Application | Was | Now |
| --- | --- | --- |
| Intake | Gmail/SMS | **ChatGPT** + **M365 Outlook**, web, SMS |
| Triage | JobNimbus/Roofr | **ChatGPT** (classify/route) + **M365** (record) |
| Estimator | single agent | **Roofr + Hover + Handoff.ai** trio (above) |
| Proposals | Google Docs / QuickBooks | **M365** (Word/SharePoint) + e-sign + **QuickBooks** estimate |
| Scheduler | Google Calendar | **M365 Outlook Calendar** / Teams |
| Jobs | JobNimbus / Drive | **M365** (Teams + SharePoint/OneDrive) |
| Billing | QuickBooks / Stripe | **QuickBooks** (invoices, payment links) (+ Stripe if needed) |
| Retention | Gmail / SMS | **M365 Outlook** + SMS; reviews |
| Dashboard | Google Sheets / QBO | **Excel / Power BI** + **QuickBooks** reports |

---

## 4. The workflow (lead → cash) on the new stack

1. **Lead** lands (Outlook, web, phone) → **ChatGPT** captures + qualifies.
2. **Measure & design** in parallel: **Roofr** pulls aerial measurements; **Hover** builds the 3D
   design if photos exist.
3. **Estimate:** **Handoff.ai** (Chief Estimator) combines both + R&B pricing → the number.
4. **Proposal:** assembled in **M365** (branded Word/PDF), e-signed; estimate logged in **QuickBooks**.
5. **Schedule:** **Outlook Calendar** / Teams books inspection/install.
6. **Job:** tracked in **Teams + SharePoint** (photos, status, homeowner updates).
7. **Invoice & collect:** **QuickBooks** invoice + payment link + dunning.
8. **Retain:** **Outlook** review/referral asks; maintenance reminders.
9. **Report:** **Excel/Power BI** + QuickBooks over the whole pipeline.

---

## 5. Integration feasibility (confirm before building)

Each vendor connects by a different surface — confirm which R&B can use:

| Tool | Likely surface | Note |
| --- | --- | --- |
| ChatGPT | Custom GPTs + **Actions** (OpenAPI), Connectors | The front door / or the orchestrator |
| Microsoft 365 | **Microsoft Graph API** (first-class) | Strong, well-documented |
| QuickBooks | **QuickBooks Online API** | First-class; invoices/estimates/payment links |
| Roofr | Native partner integrations / Zapier | **[CONFIRM]** open API maturity for ordering reports |
| Hover | **Hover API** / partner program | **[CONFIRM]** API access + plan |
| Handoff.ai | Native integrations (QuickBooks etc.) / API | **[CONFIRM]** programmatic estimate API |

> Reality check: Roofr, Hover, and Handoff.ai may expose **partner/Zapier integrations rather
> than full open APIs**. Where there's no API, the workflow bridges them via Zapier or a thin
> connector — confirm each vendor's surface on the audit before committing.

---

## 6. What this means for the existing RB-OS scaffold

Mostly reusable — the **shape** (Brain + Agency-of-specialists + one front door) holds. What
changes:

- **Specialists:** retire the JobNimbus bindings; split Estimator into **Roofr / Hover /
  Handoff.ai** agents; re-point Google → **M365 (Graph)**.
- **Front door:** add **ChatGPT** as a client (custom GPT + Actions) alongside the MCP server.
- **Orchestration brain:** this is the open decision (below). The current Agency runs on Claude
  Managed Agents; R&B now wants ChatGPT in the loop.

> Holding the YAML/agent rewrites until the orchestration decision is made — otherwise we'd build
> bindings for a platform we might not use.

---

## 7. The decision: where does orchestration live?

| Option | What it is | Pros | Cons |
| --- | --- | --- | --- |
| **A. ChatGPT-native** | Custom GPTs + Actions call each tool directly | Simple; lives where R&B already is | Actions are synchronous; multi-step/stateful workflows get awkward; logic spread across GPTs |
| **B. Agency middleware + ChatGPT front-end** *(recommended)* | Keep the provider-agnostic Agency as the orchestration core; ChatGPT (and Teams, web app) are clients that call it | One integrated platform; no AI-vendor lock-in; reuses RB-OS; robust multi-step + shared Brain | One backend to host (Allerion already does) |
| **C. Microsoft-native** | Copilot Studio + Power Automate in M365 | Tightest M365 fit; low-code | Ties orchestration to Microsoft; weaker fit for ChatGPT-first UX |

**Recommendation: B.** It literally delivers "one integrated platform": the Agency is the brain
that runs the lead→cash workflow and fans out to Roofr/Hover/Handoff/QuickBooks/M365, while R&B
employees still work inside **ChatGPT** (and Teams). The orchestration brain under the hood can be
GPT *or* Claude — your call, decoupled from the tools — so you're never locked to one vendor.

---

## 8. Open questions for the audit

1. ChatGPT plan — Team or Enterprise? (Determines Actions/Connectors + data controls.)
2. M365 tenant + admin access for Graph API app registration?
3. Roofr / Hover / Handoff.ai — confirmed API access, or Zapier/native only?
4. Does Handoff.ai become the pipeline/CRM of record (replacing JobNimbus), or just estimating?
5. R&B's pricing catalog — who owns it, and does it live in Handoff.ai or RB-OS?
6. Stripe still needed if QuickBooks payment links cover collections?
