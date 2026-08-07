# R&B Roofing & Remodeling — White-Label AI Engagement

**Client:** R&B Roofing & Remodeling — Louisville, KY
**Delivered by:** Allerion Systems
**Status:** First client. Automation audit scheduled.
**Engagement goal:** Design and build a complete custom **white-label AI platform** for R&B that automates their business end to end — from lead capture through estimate, proposal, scheduling, job execution, payment, and follow-up.

---

## What this folder is

This is the engagement workspace for R&B Roofing & Remodeling. It holds the discovery,
strategy, and architecture artifacts that drive the build. Implementation assets (agents,
skills, commands, services) are added in later phases against the roadmap below.

| File | Purpose |
| --- | --- |
| `README.md` | This overview. |
| `automation-audit.md` | The scheduled business-automation audit: process map, bottlenecks, prioritized opportunities, and the discovery-call agenda. |
| `whitelabel-ai-blueprint.md` | The target architecture for R&B's white-label AI platform, the AI model strategy, and the phased build plan. |

---

## Reference prototype

R&B already has a working proof-of-concept built on Replit — the **"Roofing Instant
Estimator"** ("R&B Roofing & Remodeling — Louisville's Trusted Contractor"). It demonstrates
the headline capability: **AI-powered satellite estimates in minutes**. Observed scope and
stack (from the live prototype):

- **Services marketed:** roofing, siding, solar, decks, and full remodeling.
- **Headline feature:** instant satellite/aerial roof measurement → AI-generated estimate.
- **Stack:** React 19 + Vite + Tailwind front end; Express + Drizzle ORM (PostgreSQL) back
  end; AI via Anthropic / OpenAI / Gemini; Stripe payments; Cesium/Three.js for
  satellite/3D; Passport + Replit auth; PDF generation.

The prototype is the *seed* of the platform, not the whole product. The engagement extends
it into a complete, branded, automated operations system for R&B.

> Treat the prototype as a requirements reference. The build target is a maintainable,
> R&B-branded platform — not a fork of the Replit project.

---

## How we work this engagement

1. **Audit** (`automation-audit.md`) — confirm R&B's real processes, tools, and volumes on
   the scheduled call; lock the prioritized opportunity list.
2. **Blueprint** (`whitelabel-ai-blueprint.md`) — finalize architecture, branding, and the
   AI model strategy.
3. **Build in phases** — each phase ships a working automation, smallest coherent slice
   first (see the roadmap in the blueprint).

Anything marked **[CONFIRM]** is an assumption to validate with R&B before we rely on it.
