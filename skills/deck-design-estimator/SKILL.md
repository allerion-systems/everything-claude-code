---
name: deck-design-estimator
description: Turn site photos plus a short homeowner interview into three priced deck design options and a full bill of materials. Use whenever the user shares yard/backyard photos, asks for a deck design or quote, mentions a deck rebuild, or types `/deck-design`.
origin: ECC
---

# Deck Design & Estimator

A complete, photo-first workflow for designing residential decks and producing contractor-grade material/labor estimates. The skill is built so the user only has to (a) upload photos and (b) answer ≤4 questions — the agent does the rest.

## When to Activate

- User attaches photos of a yard, deck site, or existing deck and asks for ideas.
- User says "design me a deck", "what would a new deck cost", "redo my backyard deck", "deck plan for my house".
- User runs `/deck-design`.
- The `deck-design-estimator` agent is invoked.

## Reference Files (load on demand)

| File | When to load |
|------|--------------|
| `reference/site-photo-analysis.md` | Step 2 — analyzing every uploaded photo |
| `reference/intake-questions.md` | Step 3 — interviewing the homeowner |
| `reference/deck-plans-catalog.md` | Step 4 — choosing shape/elevation candidates |
| `reference/design-options-template.md` | Step 4 — assembling the three options |
| `reference/materials-pricing-2026.md` | Steps 4 & 6 — every cost line |
| `reference/estimator-formulas.md` | Step 6 — quantity takeoffs & math |
| `reference/code-and-permits.md` | Steps 2 & 7 — code flags and permit checklist |

Always load the file before you cite numbers from it. Do not paraphrase pricing from memory.

## The Seven-Step Workflow

### Step 1 — Photo Intake

Greet the user, then request photos with this exact ask (paraphrase only if user has already supplied some):

> To design a deck I can actually quote, I need a quick photo set. The more I get, the tighter the estimate:
> 1. Wide shot of the back of the house from 30+ ft away (full footprint visible)
> 2. Close-up of the wall where the deck would attach — show the door, siding, and a few feet to either side
> 3. Ground/grade shot from where you'd step off the deck — I'm looking for slope and drainage
> 4. Any obstacles within 10 ft: AC unit, gas/electric meter, dryer vent, low windows, trees, hose bibs
> 5. Optional but helpful: a property-line shot if a fence is nearby, and the inside of the door so I see the threshold height
>
> A rough measurement of the wall width where the deck would sit is gold if you have a tape measure handy. Otherwise I'll estimate from the photos.

Accept whatever the user actually sends. Do not block on missing photos — note gaps in the Site Analysis.

### Step 2 — Site Analysis

For each photo, use the `Read` tool to view it, then walk the `reference/site-photo-analysis.md` checklist. Combine into one **Site Analysis** report with these sections:

```
## Site Analysis
### What I see
- House style: <ranch / colonial / craftsman / modern / split-level>
- Siding: <vinyl / fiber-cement / wood lap / brick / stucco / EIFS>
- Door type & height above grade: <patio slider / French / single / ~XX inches>
- Approx. wall width available: <XX ft>
- Grade: <flat / gentle slope away / steep slope / cross-slope>
- Drainage: <clear / pooling visible / downspout in deck zone>
- Sun exposure (from compass clues): <morning sun / full afternoon / mostly shade>

### Obstacles & utilities
- <list each, with proximity in feet>

### Risks & flags
- <e.g. deck surface will be >30" above grade — guardrail required, permit almost certain>
- <e.g. AC condenser within 6 ft — needs clearance or relocation>
- <e.g. brick veneer ledger — engineered fasteners or freestanding design required>

### What I still need
- <photos or dimensions you'd like before finalizing>
```

Send this to the user before asking any questions. It builds trust and surfaces issues early.

### Step 3 — Lifestyle & Budget Intake

Use `AskUserQuestion` with the bundles in `reference/intake-questions.md`. Target ≤4 prompts total. Defaults exist for every answer so the user can skip.

### Step 4 — Generate Three Design Options

Pick three candidate plan archetypes from `reference/deck-plans-catalog.md` that fit the site, lifestyle, and budget. Apply `reference/design-options-template.md` to produce:

- **Option A — Budget**: Pressure-treated framing + pressure-treated decking, simple shape, code-minimum railing, no premium features.
- **Option B — Balanced**: Pressure-treated framing + mid-grade composite decking, one architectural feature (bench, planter, pergola, or shape break), upgraded composite railing.
- **Option C — Premium**: Pressure-treated framing + premium capped composite or hardwood decking, multi-level or signature shape, cable/aluminum/glass railing, lighting + one major feature (covered pergola, hot-tub bay, outdoor kitchen pad).

Each option must differ on ≥2 of: **shape, material, elevation, feature set**. They are not three flavors of the same deck.

Present them in a comparison table followed by three short narrative paragraphs.

### Step 5 — User Picks an Option

Use `AskUserQuestion` with the three options as choices plus an "Other / mix-and-match" path. If the user mixes (e.g. "Option B with Option C's railing"), accept and recompute the estimate in Step 6.

### Step 6 — Detailed Estimate

For the chosen design, run the takeoff formulas in `reference/estimator-formulas.md`. Output as one Markdown document the user can paste into an RFQ:

```
# Deck Estimate — <plan name>

## Plan summary
- Shape: <rectangle / L / wrap / multi-level>
- Dimensions: <e.g. 16' × 20' main + 8' × 10' lower>
- Surface area: <XXX sq ft>
- Height above grade: <XX inches>
- Decking material: <product>
- Railing: <type, linear feet>
- Stairs: <number of risers, width>
- Footings: <number, diameter, depth>

## Bill of materials
| Item | Spec | Qty | Unit price | Line total |
|------|------|-----|------------|------------|
| Decking boards | <product, length> | <qty> | $X.XX | $XXX.XX |
| ... |

## Labor estimate
| Phase | Hours | Rate | Subtotal |
| Footings & posts | ... | ... | ... |
| ... |

## Permits & misc
- Building permit: $XXX (verify with local jurisdiction)
- Utility locate (811): free
- Disposal/dumpster: $XXX

## Totals
- Materials subtotal: $X,XXX
- Labor subtotal: $X,XXX
- Permits & misc: $XXX
- Contingency (10%): $XXX
- **Grand total: $X,XXX**

## Notes & assumptions
- Pricing reflects 2026 U.S. national averages; <region adjustment if known>
- Assumes existing soil bears ≥1,500 PSF; if not, footings change
- Assumes <something else>
```

### Step 7 — Next Steps Checklist

End the conversation with:

```
## Next steps
1. Call 811 (Miss Utility) at least 48 hours before any digging. Free.
2. Apply for a building permit at your local building department. Bring:
   - This estimate
   - A plot plan showing setbacks (most jurisdictions require 5-10 ft from property line)
   - Framing plan (Decks.com plans include this — see link below)
3. Get 3 contractor bids using the bill of materials above as the spec.
4. Visualize in 3D: https://www.decks.com/deck-designer/
5. Order materials 2–4 weeks before start date; composite decking can have lead time.

## Want a different option or to tweak this one?
Just say which design (A/B/C) or what to change — material, size, feature — and I'll re-run the numbers.
```

## Quality Gates

Before sending the final estimate, self-check:

- [ ] All photos analyzed; gaps noted
- [ ] User answered intake (or defaults applied with disclosure)
- [ ] Three options differ on ≥2 axes
- [ ] User explicitly picked one (or mixed)
- [ ] Every cost line: unit price × quantity
- [ ] Waste factors applied (10% decking, 5% framing)
- [ ] Code/setback/utility risks called out
- [ ] Contingency in the total (10–15%)
- [ ] Permit + 811 mentioned

## Anti-Patterns to Avoid

- **Designing before analyzing photos.** Don't.
- **One "right" design.** Always three.
- **Hiding the math.** Every dollar has a line.
- **Assuming attachment to the house.** If wall is brick veneer, EIFS, or unknown, default to **freestanding** with its own ledger beam and 4 extra footings.
- **Ignoring grade.** A 3" slope across 20 ft changes the post heights and the stair count. Call it out.
- **Quoting hardware as "fasteners — $50."** Itemize joist hangers, structural screws, hex bolts, post bases — each has a count and a price.

## Tone

Friendly, expert, decisive. The user is a homeowner, not a framer. Use plain English for everything except the bill of materials, which uses trade terms (joist, beam, ledger, rim, blocking) so a contractor can quote it.
