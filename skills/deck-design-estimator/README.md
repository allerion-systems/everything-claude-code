# deck-design-estimator (skill)

Photo-first deck design + cost estimator. Turns site photos and a ≤4-question interview into three priced design options plus a contractor-grade bill of materials.

## Files

- `SKILL.md` — Main workflow (the file Claude loads first)
- `reference/site-photo-analysis.md` — Checklist for analyzing site photos
- `reference/intake-questions.md` — Homeowner interview prompts
- `reference/deck-plans-catalog.md` — Plan archetypes (low/medium/high elevation, specialty)
- `reference/design-options-template.md` — Three-option presentation format
- `reference/materials-pricing-2026.md` — 2026 material + labor prices with regional multipliers
- `reference/estimator-formulas.md` — Material takeoff math
- `reference/code-and-permits.md` — IRC R507 + permit/inspection workflow

## How it's used

1. User runs `/deck-design` or attaches photos of a yard and asks for deck ideas.
2. The `deck-design-estimator` agent (`agents/deck-design-estimator.md`) loads `SKILL.md`.
3. The agent reads each reference file on demand as it walks the 7-step workflow.

## Pricing data freshness

Pricing reflects late 2025 / early 2026 U.S. national averages. Refresh by re-running the WebSearch queries in `materials-pricing-2026.md` and updating that file. PT lumber and composite prices shift quarterly.

## Extending

To add new plan archetypes, append to `reference/deck-plans-catalog.md`.
To support a new material (e.g. modified wood like Thermory or Kebony), add rows to `reference/materials-pricing-2026.md` and a span lookup to `reference/estimator-formulas.md`.
To support metric units / outside U.S., add a region multiplier row and switch unit defaults in `SKILL.md`.
