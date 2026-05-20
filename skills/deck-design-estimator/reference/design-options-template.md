# Design Options Template

Use this template to present three distinct options to the homeowner. They must differ on **≥2 axes**: shape, material, elevation, or feature set.

## Output structure

Send all three options in one message, in this order:

```
## Your three design options

### At-a-glance comparison

| | Option A — Budget | Option B — Balanced | Option C — Premium |
|---|---|---|---|
| Plan archetype | <e.g. LP-1 Rectangle> | <e.g. MP-2 Two-level> | <e.g. SP-3 Covered porch> |
| Dimensions | 14' × 20' | 14' × 16' upper + 12' × 14' lower | 14' × 20' + 10' × 12' covered |
| Surface area | 280 sq ft | 392 sq ft | 400 sq ft |
| Decking | PT SYP | Mid-grade composite | Capped composite or hardwood |
| Railing | PT wood, code-min | Composite | Cable or aluminum |
| Features | None | Built-in bench | Pergola + lighting |
| Est. all-in cost | $X,XXX | $X,XXX | $X,XXX |
| Build time | ~5 days | ~7 days | ~12 days |
| Maintenance | Stain every 2 yr | Wash 1×/yr | Wash 1×/yr |
| Lifespan | 10-15 yr | 25-30 yr | 30-50 yr |

### Option A — <name>
<2-3 sentence narrative: what it looks like, who it suits, why it's "budget">
**Trade-off**: <one concrete trade-off, e.g. "PT decking will need restaining within 2 years and replacement around year 15">

### Option B — <name>
<2-3 sentence narrative>
**Trade-off**: <one concrete trade-off, e.g. "Composite costs ~40% more upfront but lasts twice as long with minimal maintenance">

### Option C — <name>
<2-3 sentence narrative>
**Trade-off**: <one concrete trade-off, e.g. "Premium build is showcase-quality but requires structural engineering for the pergola and adds 4-6 weeks to permit timeline">

---

Which one feels right? Or tell me to mix elements from two — e.g. "B's layout with C's railing" — and I'll re-price.
```

## Selection criteria for each option

### Option A — Budget
- **Shape**: simplest fit for the site (usually rectangle)
- **Material**: PT decking + PT framing
- **Elevation**: stay at site's natural height; avoid multi-level
- **Features**: none — just deck + code-minimum railing + stairs
- **Target $/sqft (installed)**: $25-35
- **Who it suits**: tight budget; planning to sell within 5 years; rental property; ground-level walk-out

### Option B — Balanced (recommended starting point)
- **Shape**: one design move (L-shape, bump-out, or two-level) over Option A
- **Material**: mid-grade composite decking + PT framing (the industry default in 2026)
- **Elevation**: same as site requires
- **Features**: pick one — built-in bench OR planters OR upgraded railing OR lighting
- **Target $/sqft (installed)**: $40-55
- **Who it suits**: most homeowners; staying 7+ years; want low maintenance; family of 3-5

### Option C — Premium
- **Shape**: signature move — multi-level, wrap-around, or covered porch
- **Material**: premium capped composite, PVC, or hardwood (ipe/cumaru)
- **Elevation**: design-driven, not site-driven
- **Features**: stack 2+ — pergola + lighting OR covered roof OR hot-tub bay OR outdoor kitchen pad
- **Target $/sqft (installed)**: $65-100+
- **Who it suits**: forever home; outdoor entertaining is a top hobby; resale comps in neighborhood support it

## How to vary on ≥2 axes — examples

**Good triplets** (each varies on multiple axes):

| | Option A | Option B | Option C |
|---|---|---|---|
| Shape | Rectangle 14×20 | L-shape 14×20 + 8×8 | Two-level: 14×16 upper + 12×14 lower |
| Material | PT | Mid composite | Premium composite + pergola |
| Variations | Shape ✓ Material ✓ | | |

| | Option A | Option B | Option C |
|---|---|---|---|
| Shape | Rectangle 16×20 | Rectangle 16×20 | T-shape 16×20 + 8×10 |
| Material | PT | Cedar | Ipe |
| Features | None | Bench | Cable rail + pergola |
| Variations | Material ✓ Features ✓ | | |

**Bad triplets** (only one axis varies — DO NOT DO THIS):

| | A | B | C |
|---|---|---|---|
| Shape | Rectangle 16×20 | Rectangle 16×20 | Rectangle 16×20 |
| Material | Trex Enhance Basics | Trex Enhance Naturals | Trex Transcend |

This is three Trex grades, not three designs. Always change the SHAPE and/or FEATURES, not just the material grade.

## Pricing each option

Use `reference/estimator-formulas.md` to get a quick takeoff for each option. You don't need a full bill of materials for the at-a-glance comparison — a single $/sqft × area calculation works:

```
Option A all-in ≈ surface_area × target_$/sqft + permit ($300) + contingency (10%)
```

The full bill of materials only comes after the user picks one in Step 5.

## Where to keep options honest

- **Don't over-promise on lifespan.** PT lasts 10-15 years before significant rework; composite 25-30 with the warranty; only PVC/hardwood realistically clear 40+.
- **Be honest about hot weather.** Dark composite hits 140°F+ in afternoon sun. Mention it before the homeowner picks black composite for a south-facing deck.
- **Call out hidden costs.** If Option C needs an engineered stamp ($400-1500), surface it in the trade-off line. Don't sneak it into the total.
- **Match style to house.** A Trex Transcend Spiced Rum board on a vinyl-sided 1990s split-level looks fine. The same board on a brick Federal-style home will look off. Recommend cooler tones (grey/charcoal) for traditional brick homes.

## When to add a 4th option

Rarely. Three is the sweet spot. Add a 4th only if:
- The user explicitly asked for DIY-only pricing (add a DIY version of Option A)
- The site has a hard constraint that splits one option into two viable paths (e.g. "ledger to brick" requires both an engineered ledger option and a freestanding option)

Otherwise: three options, one comparison table, three short narratives, one selection prompt.
