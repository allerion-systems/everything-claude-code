---
description: Draft a complete grant or SBIR proposal — narrative, budget, and justification — written to the funder's published review criteria, then scored by an adversarial reviewer before submission.
---

# Grant Write

Take one funding opportunity from screened to submittable.

**Usage:** `/grant-write <program name or slug>` — optionally name the applicant organization.

## Pipeline

### 1. Confirm eligibility
Invoke **grant-eligibility-screener** on this specific program. If NO-GO, stop and report why, including whether to target the next cycle instead. Do not draft an ineligible application.

Confirm any upstream gate is complete — an NSF SBIR full proposal requires an **approved Project Pitch** first, with its own clock.

### 2. Retrieve the review criteria
Pull the actual published criteria and weights from the solicitation or reviewer guidance, plus funded abstracts and past winners. Everything downstream is structured to these, not to a generic template.

### 3. Draft in parallel
- **grant-narrative-writer** — specific aims, technical approach, innovation, team, commercialization, broader impacts
- **grant-budget-builder** — personnel, fringe, equipment, travel, subawards, indirect, plus the justification

Both write to `grants/<program-slug>/`. They must stay consistent: every budget line maps to a narrative activity, effort percentages match the technical scope, and the timeline matches the budgeted effort.

### 4. Review
Invoke **grant-reviewer**. Four passes: administrative screen, scoring against the published criteria, the reviewer's real objections, and integrity.

### 5. Close out
Report the verdict — **Competitive** / **Fundable with revision** / **Not competitive this cycle** — ranked score-losers with fixes, and the explicit list of what the user must supply: preliminary data, letters of support, biosketches, salary and indirect rates, citations.

## Rules

- Never fabricate preliminary data, citations, collaborators, letters, or credentials. Research misconduct ends federal eligibility. Mark gaps `[TBD: what is needed, who owns it]`.
- Never invent salary, fringe, or indirect rates — ask for them.
- Verify every citation exists, or flag it for the user to supply.
- Respect page and character limits; report current counts per section.
- Loop steps 3 and 4 until the reviewer reports zero blocking items.
