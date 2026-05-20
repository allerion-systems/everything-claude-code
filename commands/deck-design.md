---
description: Turn site photos + a short interview into three priced deck design options and a full bill of materials. Invokes the `deck-design-estimator` agent.
---

# /deck-design

Designs a residential deck for a homeowner using a photo-first workflow. Invokes the **deck-design-estimator** agent to:

1. Request photos of the site
2. Analyze each photo for dimensions, grade, sun, drainage, obstacles, attachment points, and code risks
3. Run a short (≤4 question) intake interview on use case, budget, style, and timeline
4. Generate three distinct design options (Budget / Balanced / Premium) with comparison table
5. Produce a contractor-grade bill of materials + labor estimate for the chosen option
6. Hand the homeowner a permits / utilities / contractor checklist

## How to use

```
/deck-design
```

Then attach photos of:
- Wide shot of the back of the house (30+ ft away)
- Close-up of the wall where the deck will attach
- Ground/grade shot from the step-off point
- Any obstacles (AC, gas meter, low windows, trees) within 10 ft
- Optional: property line, door threshold interior view

The agent does the rest. You will be asked ≤4 clarifying questions; defaults are sensible if you skip them.

## What you get

- **Site Analysis** — what the agent saw in your photos, with code/utility risks flagged
- **Three Design Options** — comparison table + narratives, each priced all-in
- **Detailed Estimate** — full bill of materials with unit prices, labor breakdown, permits, contingency, grand total — paste-ready for a contractor RFQ
- **Next-Steps Checklist** — 811 call, permit application, contractor bids, visualization tools

## When to use

- Building a new deck and you want to skip the "talk to three contractors who all measure the yard" phase
- Replacing an old deck and need a baseline estimate before getting bids
- DIY planning: you want a real material list and labor savings calculation
- Just exploring — you want priced options before committing

## Related

- Agent file: `agents/deck-design-estimator.md`
- Skill file: `skills/deck-design-estimator/SKILL.md`
- Pricing data: `skills/deck-design-estimator/reference/materials-pricing-2026.md`

## Tips

- The more photos you share, the tighter the estimate. One blurry shot of the corner of the house yields a rough estimate; six well-framed shots yield a contractor-grade one.
- If you already have measurements (wall width, door threshold height), share them — saves the agent from estimating from photos.
- Mention your ZIP code or region if you want regional pricing applied (defaults to U.S. national average).
- If you don't like any of the three options, say "give me three more" or "Option B but with X" — the agent will re-design.
