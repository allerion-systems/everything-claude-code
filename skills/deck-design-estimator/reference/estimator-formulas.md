# Estimator Formulas — Material Takeoff

Use these formulas to convert a chosen design into a precise material list. Show every step.

## Inputs you need before takeoff

From the chosen design, capture:

- `L` = deck long dimension (ft)
- `W` = deck short dimension (ft)
- `H` = height above grade (ft, for post sizing)
- Shape: rectangle, L, T, multi-level (each computed separately and summed)
- Decking direction (parallel to long or short side)
- Decking material + board width (5/4" boards usable width: 5.5"; 2×6 boards usable: 5.5"; some composites: 5.5"; ipe 1×6: 5.25")
- Joist spacing: 16" o.c. (PT or PT-rated composite) or 12" o.c. (some hardwoods, diagonal layouts)
- Beam configuration: dropped beam under joists, OR flush beam with hangers
- Number of stair risers
- Linear feet of railing
- Number of footings (from beam/post plan)

## Step 1 — Surface area

```
Surface area (sq ft) = L × W
```

For complex shapes, decompose into rectangles and sum. For an octagon of width `D`: area ≈ 0.828 × D².

## Step 2 — Decking boards

```
Linear feet of decking = (Surface area / board usable width in feet) × 1.10 waste factor

Where board usable width = (nominal width - 0.25" gap) / 12

For a 5.5"-wide board with 1/4" gap:
  Usable width = (5.5 - 0.25) / 12 = 0.4375 ft
  Linear ft = Surface area / 0.4375 × 1.10
```

Then divide linear feet by available board length (8, 12, 16, 20 ft) — prefer fewest seams. For composite, butt joints must land on a joist, so plan board lengths to land on 16" centers.

**Quick lookup** (with 10% waste, 5.5" boards, 1/4" gap):

| Deck sq ft | Linear ft of decking |
|------------|----------------------|
| 100 | ~252 lf |
| 200 | ~503 lf |
| 280 | ~704 lf |
| 320 | ~805 lf |
| 400 | ~1,006 lf |
| 500 | ~1,257 lf |
| 600 | ~1,509 lf |

## Step 3 — Joists

```
Number of joists = ceiling(W / joist_spacing_in_feet) + 1

Where joist_spacing_in_feet = 16/12 = 1.333 ft (for 16" o.c.)
                            = 12/12 = 1.0 ft (for 12" o.c.)
```

Joist length = `L` (or run direction length); buy next 2-ft increment up.

Joist size from IRC Table R507.6 (PT SYP, 16" o.c., 40 PSF live load):

| Span (ft) | Joist size |
|-----------|------------|
| ≤6 | 2×6 |
| 6–10 | 2×8 |
| 10–14 | 2×10 |
| 14–18 | 2×12 |
| >18 | Engineered (LVL) |

Add **rim joists** on both ends: 2 × `L` linear feet.
Add **blocking** between joists at 8 ft o.c. when joist span >6 ft: roughly `0.5 × number_of_joists` short pieces.

## Step 4 — Beams

Beams are typically two or three 2×10 or 2×12 PT laminated.

```
Beam length = L
Number of beam plies = 2 (for spans up to ~10 ft between posts) or 3 (longer)
Beam lumber = Beam length × plies
```

Beam size from IRC Table R507.5 (PT SYP):

| Joist span carried (ft) | Post spacing 6 ft | Post spacing 8 ft | Post spacing 10 ft |
|--------------------------|---------------------|---------------------|----------------------|
| 6 | 2-2×8 | 2-2×10 | 2-2×10 |
| 8 | 2-2×10 | 2-2×10 | 3-2×10 |
| 10 | 2-2×10 | 3-2×10 | 3-2×12 |
| 12 | 3-2×10 | 3-2×12 | LVL |

## Step 5 — Posts and footings

```
Number of posts = (number of beams) × (number of post points per beam)

Post points per beam = ceiling(L / max_post_spacing) + 1
  where max_post_spacing = 8 ft (typical for double 2×10 beam)
```

Post size:
- ≤4 ft tall: 4×4 PT
- 4-8 ft tall: 6×6 PT GC
- >8 ft tall: 6×6 PT GC with lateral bracing OR engineered

```
Number of footings = number of posts
```

Footing diameter from IRC Table R507.3 (assumes 1,500 PSF soil):

| Tributary area per footing (sq ft) | Min diameter |
|--------------------------------------|----------------|
| ≤20 | 8" |
| 20-40 | 10" |
| 40-60 | 12" |
| >60 | 14" or pad footing |

Footing depth = local frost depth (varies 12"-60"+); deepen to frost-free in cold climates.

## Step 6 — Ledger (for ledgered decks)

```
Ledger lumber = L (one piece, sized to match joists: usually 2×10 or 2×12 PT)
Ledger bolts = (L × 12 / 16) round up
  (1/2" × 6" hex bolts spaced max 16" o.c., staggered top/bottom)
Flashing tape = L linear feet
Aluminum flashing = L linear feet
```

If freestanding (no ledger), add:
- One more beam (parallel to house, replacing the ledger): same beam size, same length
- 3-4 more posts and footings on the house side

## Step 7 — Railing

```
Linear feet of railing = perimeter of unattached deck edges - door opening widths

Posts = ceiling(linear_ft / 6) + 1  (posts every 6 ft for prescriptive)
```

For composite/aluminum systems, count panels not pickets — manufacturer-specific.

## Step 8 — Stairs

```
Number of risers = ceiling(deck_height_inches / 7.5)
Riser height = deck_height_inches / number_of_risers  (must be ≤7.75" per IRC)
Tread depth = 10" minimum
Total run = (number_of_risers - 1) × tread_depth

Stringers: 2 stringers for stair width ≤36"; 3 stringers for 36-48"; 4 for ≥48"
Stringer lumber: 2×12 PT, length = sqrt(total_run² + total_rise²) × 1.05 cut waste, round up to 2-ft increment
```

For a 36"-tall deck:
- 36 / 7.5 = 4.8 → **5 risers** at 7.2" each
- Total run = 4 × 10" = 40" (~3.5 ft)
- 2 stringers, 8 ft long (2×12 PT)
- Treads: 5 × 36" wide PT 2×6 (or matching decking)
- 1 stair landing concrete pad: 36" × 40", 4" thick

## Step 9 — Hardware count

```
Joist hangers = number_of_joists × 2 (one each end, where joist meets ledger or rim)

Hurricane ties = number_of_joists (at beam connections)

Post bases = number_of_posts
Post caps = number_of_posts (post-to-beam)

Hex bolts (ledger): from Step 6

Carriage bolts (rail post): number_of_rail_posts × 2

Deck screws or hidden fasteners:
  - 5 lb deck screws per ~200 sq ft of PT deck
  - 1 box hidden fasteners (175-pc) per ~100 sq ft of composite
```

## Step 10 — Concrete bags

From the materials pricing reference, look up bags per footing. Sum across all footings.

## Step 11 — Labor estimate

```
Labor subtotal = surface_area × labor_$/sqft_for_full_build
  Default: $16/sqft for a mid-range contractor build (range $11-22)

Add for features:
  Stairs: $50/riser × number of risers
  Railing complexity adder: $5/linear ft for cable/glass (already in railing $/lf)
  Pergola: $800-2000 install
  Bench/planter: $200-400 install each
  Lighting: $200-500 install
```

For DIY: subtract labor entirely; add tool rental ($300-800 for a typical build).

## Step 12 — Roll-up

```
Materials subtotal = sum of all line items (with regional multiplier applied)
Labor subtotal     = from Step 11
Permits & misc     = from permits table
Subtotal           = materials + labor + permits & misc
Contingency        = 10% of subtotal (15% if remodel/teardown involved)
Grand total        = subtotal + contingency
```

Round grand total to nearest $100 in output. Show contingency separately.

## Sanity checks before printing the estimate

- [ ] Total $/sqft is in range for the material (cross-check against `materials-pricing-2026.md` installed prices)
- [ ] Number of footings ≥ 4 (every deck needs a perimeter)
- [ ] Joist hangers count matches joist count × 2
- [ ] Railing linear feet matches actual perimeter minus stair opening and door opening
- [ ] Stair count produces a riser height between 6.5" and 7.75"
- [ ] No line items missing units, quantity, or unit price

## Worked example — 16' × 20' rectangle, mid-grade composite, 32" above grade, ledgered

- Surface area: 16 × 20 = **320 sq ft**
- Decking: 320 / 0.4375 × 1.10 = **805 lf**; in 16-ft boards: 51 boards
- Joists (16" o.c., span 16 ft): need 2×10 PT; ceil(20/1.333) + 1 = **16 joists** × 16 ft
- Rim joists: 2 × 20 = **40 ft** of 2×10
- Ledger: 20 ft of 2×10
- Beam: 2-ply 2×10 × 20 ft long = **2 × 2×10 × 20 ft**
- Posts (3 footings, 32" tall): 3 × 4×4 × 4 ft
- Footings: 3 × 8" dia × 4 ft = 12 concrete bags (80 lb)
- Joist hangers: 16 × 2 = **32 × LUS210** (so 2 packs of 25)
- Hurricane ties: 16 × **H1** (1 pack of 50)
- Post bases & caps: 3 each
- Ledger bolts: 20 × 12 / 16 = 15 bolts staggered = ~30 total
- Flashing tape: 20 lf
- Railing: 16 + 20 + 16 = 52 lf (3 sides, 4th side is house) — 1 opening for stairs = 52 - 4 = **48 lf**
- Rail posts: ceil(48/6) + 1 = **9 posts**
- Stairs: 32" / 7.5 = 5 risers; 36" wide; 2 stringers, 8 ft of 2×12
- Hidden fasteners: 320 / 100 = **4 boxes** (175 pc)

Bill of materials (with mid-grade composite at $8/sqft material, regional 1.0):

| Item | Qty | Unit price | Line total |
|------|-----|------------|------------|
| Composite decking, mid-grade | 320 sqft (805 lf) | $8.00/sqft | $2,560 |
| 2×10 × 16 PT joist | 16 | $36 | $576 |
| 2×10 × 12 PT (rim, ledger, beam) | 6 | $26 | $156 |
| 4×4 × 8 PT post | 3 | $17 | $51 |
| 8" × 4' Sonotube | 3 | $14 | $42 |
| Concrete 80 lb | 12 | $8 | $96 |
| Joist hanger LUS210 (25-pk) | 2 | $52 | $104 |
| Hurricane tie H1 (50-pk) | 1 | $40 | $40 |
| Post base ABU44Z | 3 | $14 | $42 |
| Post cap PC44Z | 3 | $11 | $33 |
| Ledger bolts 1/2"×6" | 30 | $3 | $90 |
| Flashing tape 4"×50' | 1 | $42 | $42 |
| Aluminum flashing 10' | 2 | $20 | $40 |
| Hidden fasteners (175-pk) | 4 | $68 | $272 |
| Composite railing | 48 lf | $80/lf | $3,840 |
| Stair stringer 2×12 × 8 | 2 | $40 | $80 |
| Stair treads (composite) | 5 risers | $180/riser | $900 |
| **Materials subtotal** | | | **$9,004** |
| Labor (320 sqft × $16) | | | $5,120 |
| Permit | | | $300 |
| **Subtotal** | | | **$14,424** |
| Contingency 10% | | | $1,442 |
| **Grand total** | | | **$15,866** |
