---
description: Draft a tailored Allerion proposal, fill the digital service-agreement, and prep the booking + deposit links for a prospect. Drafts only — the human reviews and sends. Use after an audit/discovery call to close.
---

# Close

Turn discovery/audit notes into a ready-to-send close package for an Allerion prospect: a
tailored proposal, a filled digital contract, and the booking + payment links to paste in.

Draws on `skills/ai-consulting-playbook/SKILL.md`, the unified offer ladder in
`docs/allerion/business-model-and-market-research.md`, the flow in
`docs/allerion/booking-and-close-flow.md`, and the template at
`docs/allerion/templates/service-agreement.md`.

## Usage

```
/close <prospect + notes>
   e.g. /close R&B-style roofer, 12 crew, QuickBooks + paper, loses ~6 hrs/wk re-typing
        job data, ~4 quotes/mo never followed up. Recommend quote-follow-up engine.
```

## Workflow

1. **Read the notes.** Extract: the pain, **the number** (hours and/or revenue), the one
   recommended workflow, and any constraints (tools, scope, legacy data volume).

2. **Draft the proposal** (short, owner-readable, no jargon):
   - Their pain, in their words + the number.
   - The recommended workflow and what it changes day-to-day.
   - The ladder: Audit $1,500 (credited) → Build [pick the right tier: $3–8K modern, $8–18K
     legacy/Company Brain] → Retainer $500–2,500/mo. Justify the build tier from the notes.
   - **ROI line:** recover ~[X hrs/wk] = ~[£/$ Y/yr] vs. the price.
   - The next step: book the audit (or, if audit done, start the build).

3. **Fill the contract.** Populate `templates/service-agreement.md` with client name, the
   selected services, the scope (the one workflow), fees for the chosen tiers, and dates. Flag
   any bracketed field you couldn't fill.

4. **Prep the links** (per `booking-and-close-flow.md`):
   - A Google Calendar booking slot for the audit/kickoff (suggest 2 times).
   - A Stripe payment link for the audit fee or build deposit.
   - Note: **do not send or charge anything** — output the drafts + links for J. to review.

5. **Output the package** clearly separated: `PROPOSAL`, `CONTRACT (filled)`, `LINKS TO PASTE`,
   and a short `REVIEW BEFORE SENDING` note listing anything assumed or missing.

## Output

A review-ready close package. Money and client-facing sends always pass through the human first.
