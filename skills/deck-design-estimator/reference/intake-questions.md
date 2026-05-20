# Homeowner Intake Questions

Use `AskUserQuestion` to ask these. Goal: ≤4 prompts total. Bundle aggressively. Every question must have a sensible default so the user can skip.

## Prompt 1 — Primary use & capacity (single-select)

**Question**: "What's the main thing you want to do on this deck?"
**Header**: "Primary use"

| Option | Description |
|--------|-------------|
| Dining & entertaining (Recommended) | Table for 4-8, room for a grill, conversation seating. ~250-400 sq ft |
| Lounging & sunbathing | Chaise lounges, low table, smaller footprint. ~150-250 sq ft |
| Hot tub or spa | Reinforced framing, hot-tub bay, privacy. Adds $2-5k structural |
| Multi-zone (dining + lounge + grill) | Distinct zones, often multi-level. ~400-600 sq ft |
| Just a landing / small platform | Step-out from a door, maybe a chair. <100 sq ft |

## Prompt 2 — Budget band (single-select)

**Question**: "What's your all-in budget range (materials + labor)?"
**Header**: "Budget"

| Option | Description |
|--------|-------------|
| Under $10k — DIY or pressure-treated basic | PT framing + PT decking, no premium features |
| $10k–$25k — mid-range with a contractor (Recommended) | PT framing + composite decking, basic railing, one feature |
| $25k–$50k — premium composite or hardwood | Capped composite or cedar/ipe, upgraded railing, lighting, pergola |
| $50k+ — showcase outdoor living space | Multi-level, kitchen, hot tub, signature features |
| Not sure — show me options across all bands | Default; agent shows three priced options anyway |

## Prompt 3 — Style & feature priorities (multi-select)

**Question**: "Pick anything that matters to you (or skip if no strong preference):"
**Header**: "Style & features"
**multiSelect**: true

| Option | Description |
|--------|-------------|
| Low-maintenance over warm wood look | Pushes toward composite/PVC over cedar/PT |
| Modern / minimalist aesthetic | Cable or glass railing, dark or grey decking, clean lines |
| Traditional / cottage aesthetic | White railing, cedar or warm-tone composite, planters |
| Built-in benches and planters | Adds $800-2500 depending on linear feet |
| Pergola or shade structure | Adds $2k-8k; need beam structure planning |
| Deck lighting (post caps, riser, perimeter) | Adds $400-2000 |
| Privacy screening (lattice, slats, plants) | Adds $300-1500 |
| Hot tub or spa | Triggers structural reinforcement |
| Outdoor kitchen / grill station | Need gas/electric runs; add $1500-15k |
| Match my house style closely | Drives railing color and decking tone |

## Prompt 4 — Timeline & DIY (single-select)

**Question**: "How are you thinking about getting this built?"
**Header**: "Timeline & DIY"

| Option | Description |
|--------|-------------|
| Hire a contractor, build this season (Recommended) | Standard path; estimate includes labor |
| Hire a contractor, build next year | Same estimate; flag material lead time |
| DIY with help from a friend | Subtract ~$11-22/sqft labor; add tool rental line |
| Just exploring — no commitment yet | Estimate as if hiring; provide DIY savings note |

## When to skip questions

- If the user already volunteered budget, use case, or style in their opening message, **drop that prompt entirely**. Don't make them repeat themselves.
- If photos clearly show a tiny landing zone or massive backyard, you can pre-fill the size assumption and confirm in your design options rather than asking.
- If the user types "just give me three options" or "you decide" — apply defaults across the board and proceed to Step 4.

## Defaults (when user skips or "Not sure")

- Use case: dining & entertaining
- Budget: $10k-25k mid-range
- Style: none flagged; recommend composite for low maintenance
- Timeline: hire contractor, build this season

## Sensitive topics

- **Don't ask about credit, financing, or income.** If the user wants to discuss financing, point them to home-equity loans or contractor financing — don't quote rates.
- **Don't assume household composition.** "Will kids or pets use the deck?" only if it directly affects design (e.g. gap between railing balusters).
