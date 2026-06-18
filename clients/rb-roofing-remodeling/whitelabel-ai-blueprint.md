# R&B Roofing & Remodeling — White-Label AI Blueprint

**Prepared by:** Allerion Systems
**Client:** R&B Roofing & Remodeling (Louisville, KY)
**Purpose:** The target architecture, AI model strategy, and phased build plan for R&B's
custom white-label AI platform. Driven by `automation-audit.md`.

> Items tagged **[CONFIRM]** depend on the audit call. Don't build against them until resolved.

---

## 1. Vision

A single, **R&B-branded** AI operations platform that runs the business pipeline from
`automation-audit.md`: capture → qualify → estimate → propose → schedule → execute → invoice →
retain. The homeowner experiences "R&B" everywhere; Allerion operates the platform underneath.
"White-label" means R&B's name, logo, colors, domain, and voice — no Allerion or third-party
branding in any customer-facing surface.

---

## 2. Capability map (modules)

Each module maps to an audit stage and ships independently.

| Module | Audit stage | Core job |
| --- | --- | --- |
| **Intake** | 1 Capture | One front door (web/SMS/phone/ads) + instant 24/7 response |
| **Triage** | 2 Qualify | Classify, score, dedupe, route with context |
| **Estimator** | 3 Estimate | Satellite/aerial measurement → AI estimate (extends prototype) |
| **Proposals** | 4 Propose | Tiered branded PDF + e-sign + automated follow-up |
| **Scheduler** | 5 Schedule | Self-serve booking tied to crew capacity; reminders/reschedules |
| **Jobs** | 6 Execute | Status hub, homeowner updates, material lists, photo capture |
| **Billing** | 7 Invoice | Auto-invoice, payment links, dunning, financing hand-off |
| **Retention** | 8 Retain | Review/referral asks, warranty + maintenance re-engagement |
| **Dashboard** | Cross-cutting | Speed-to-lead, pipeline, close rate, revenue, utilization |

---

## 3. Reference architecture

```
                 Customer-facing (R&B-branded)
   ┌───────────────────────────────────────────────────────────┐
   │  Web app  ·  SMS/chat  ·  phone (voice)  ·  ad landing      │
   └───────────────┬───────────────────────────────────────────┘
                   │
   ┌───────────────▼───────────────────────────────────────────┐
   │  API / orchestration layer  (Node/TypeScript, Express)     │
   │  routing · auth · webhooks · job queue · audit log         │
   └───┬───────────────┬───────────────┬───────────────┬────────┘
       │               │               │               │
 ┌─────▼─────┐   ┌─────▼─────┐   ┌─────▼─────┐   ┌─────▼──────┐
 │ AI layer  │   │ Data      │   │ Integrations            ... │
 │ (agents + │   │ Postgres  │   │ payments(Stripe) · e-sign · │
 │  models)  │   │ +Drizzle  │   │ calendar · CRM · SMS/email ·│
 │           │   │           │   │ aerial-imagery/measurement  │
 └───────────┘   └───────────┘   └─────────────────────────────┘
```

**Stack baseline (carried from the prototype, kept maintainable):**

- **Front end:** React + Vite + Tailwind; R&B theme tokens (white-label). 3D/satellite view via
  Cesium/Three.js for the estimator.
- **Back end:** Node/TypeScript (Express), PostgreSQL via Drizzle ORM.
- **Auth:** standard provider (e.g., Auth.js / Passport) — **[CONFIRM]** homeowner vs. staff roles.
- **Payments:** Stripe (financing partner **[CONFIRM]**).
- **Integrations:** CRM, calendar, e-sign, SMS/email, and the **aerial-imagery/measurement
  provider** that feeds the estimator **[CONFIRM — critical]**.

> Build target is a clean, maintainable, R&B-branded platform that *reuses the prototype's
> proven ideas* (instant estimator, Stripe, AI), not a literal fork of the Replit project.

---

## 4. AI model strategy

The platform is **agentic**: it captures, reasons, drafts, and acts across the pipeline. Match
the model to the job to balance quality against cost. Default to the latest Claude models.

**Current Claude model IDs (use the exact strings):**

| Model | ID | Context | Input $/1M | Output $/1M | Role in this platform |
| --- | --- | --- | --- | --- | --- |
| Claude Haiku 4.5 | `claude-haiku-4-5` | 200K | $1 | $5 | **High-volume, cheap** tasks |
| Claude Sonnet 4.6 | `claude-sonnet-4-6` | 1M | $3 | $15 | **Balanced** mid-tier work |
| Claude Opus 4.8 | `claude-opus-4-8` | 1M | $5 | $25 | **Complex reasoning / agentic** core |
| Claude Fable 5 | `claude-fable-5` | 1M | $10 | $50 | Most capable; reserve for the hardest cases |

**Assignment by module:**

- **Haiku 4.5 — high-volume, low-cost, latency-sensitive:** lead classification, intent/trade
  detection, address/field extraction, dedupe, spam filtering, routing decisions, review-sentiment
  triage, SMS auto-replies. These run on every inbound message; cheap + fast wins.
- **Opus 4.8 — complex reasoning and multi-step agentic flows:** estimate reasoning over the
  priced catalog (pitch/waste/complexity), proposal drafting and personalization, objection-handling
  follow-up, the orchestrator that plans multi-step actions and calls tools. This is the platform's
  default "brain."
- **Sonnet 4.6 — balanced middle tier:** homeowner-facing conversational intake/scheduling chat
  and status-update summarization, where quality matters but Opus is overkill at volume.
- **Fable 5 — reserve:** only for genuinely hard, high-stakes reasoning where Opus 4.8 proves
  insufficient (pricing is well above Opus-tier — opt in deliberately, not by default).

**Implementation notes (per Claude API guidance):**

- Use the official Anthropic SDK (`@anthropic-ai/sdk` for the TypeScript stack).
- Default to **adaptive thinking** (`thinking: {type: "adaptive"}`) on the reasoning paths
  (estimating, proposals, orchestration); tune depth with `output_config.effort`.
- **Stream** long outputs (proposals, long agent turns) to avoid HTTP timeouts.
- Use **prompt caching** for the stable system prompts + R&B's priced catalog so per-lead calls
  stay cheap.
- For the agentic orchestrator, prefer **tool use** (Claude API + tools) so each external action
  (send SMS, create Stripe invoice, book calendar slot) is a typed, auditable, gate-able tool —
  not opaque free-form output. Gate hard-to-reverse actions (charging a card, sending customer
  comms) behind confirmation where appropriate.
- The prototype reached for OpenAI + Gemini as well; for the production build, **standardize on
  Claude** as the primary provider for consistency, caching, and the agentic surface, unless the
  audit surfaces a specific reason to keep another provider for a niche task. **[CONFIRM]**

---

## 5. White-labeling approach

- **Brand tokens:** centralize logo, color palette, typography, and voice in one theme config so
  every surface (web, PDF, SMS, email) renders as R&B. Inputs come from the audit (§7.8).
- **Domain & sender identity:** R&B domain for the app and for email/SMS sender IDs.
- **Voice:** the customer-facing AI speaks as R&B — friendly, local, trustworthy ("Louisville's
  Trusted Contractor"). System prompts encode tone + guardrails (no overpromising, clear next step).
- **No leakage:** no Allerion/third-party branding in any customer-visible output.

---

## 6. Data, security & compliance (confirm in audit)

- **PII:** homeowner contact + property data — store minimally, encrypt at rest/in transit.
- **Payments:** keep card data in Stripe; never store raw card data.
- **Secrets:** API keys (Anthropic, Stripe, imagery provider, SMS/email) in a secrets manager,
  never in the repo. A `.env.example` documents required vars.
- **Auditability:** log every AI-initiated action (especially customer comms and charges) for
  review and rollback.
- **Compliance:** SMS consent (TCPA), review-gating rules, data-retention policy. **[CONFIRM]**

---

## 7. Phased build plan (roadmap)

Each phase ships a working slice — smallest coherent first, P0 before P1.

**Phase 1 — Own speed-to-lead + the flagship estimate (P0)**
- Unified Intake (web first, then SMS/phone) with instant 24/7 response.
- Triage: classify / score / dedupe / route (Haiku 4.5).
- Estimator: extend the prototype into the production estimate flow (Opus 4.8 + aerial data).
- Minimal owner dashboard: speed-to-lead + pipeline.
- **Exit criteria:** every new lead gets an instant branded response and, where address-resolvable,
  an instant ballpark estimate; qualified leads are routed with context.

**Phase 2 — Close the deal (P1)**
- Proposals: tiered branded PDF + e-sign + automated follow-up sequences.
- Scheduler: self-serve booking tied to crew capacity + reminders.
- Billing: auto-invoice + Stripe payment links + dunning.
- Dashboard: add close rate + revenue.

**Phase 3 — Run & retain (P2)**
- Jobs: status hub + automated homeowner updates + material lists + photo capture.
- Retention: review/referral asks + warranty/maintenance re-engagement.
- Dashboard: crew utilization + AI-vs-human handled volume.

**Phase 4 — Optimize**
- Tune model assignments and effort levels against real volume/cost.
- Expand autonomy where the audit log shows the AI is reliably correct.

---

## 8. Open dependencies (blockers to resolve on the audit call)

1. **Aerial imagery / measurement provider** for the estimator at production scale + cost. *(critical)*
2. **Priced catalog** (materials, labor rates, waste/pitch/complexity factors) R&B will provide.
3. **Tool stack** to integrate vs. replace (CRM, calendar, e-sign, accounting).
4. **Brand assets** (logo, colors, domain, voice).
5. **Provider standardization** decision (Claude-primary vs. keep OpenAI/Gemini for niche tasks).
6. **Compliance** constraints (SMS consent, data handling, review gating).
