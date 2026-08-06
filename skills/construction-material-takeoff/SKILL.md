---
name: construction-material-takeoff
description: >
  Codified expertise for producing vendor-ready construction material takeoffs
  and bills of materials (BOMs) from mixed sources: plan sets (S/A sheets),
  design intake docs, photogrammetry reports, and field voice notes. Covers
  source precedence (drawings beat verbal, newest revision wins), per-assembly
  framing takeoff math, connector hardware mapping, concrete volume checks
  against footing schedules, and discrepancy flagging with cost deltas. Use
  when turning a plan set or jobsite conversation into a purchasable lumber
  yard or big-box order, reconciling a verbal order against drawings, or
  sanity-checking quantities before a crew pickup.
license: Apache-2.0
version: 1.0.0
homepage: https://github.com/affaan-m/everything-claude-code
origin: ECC
metadata:
  author: jallee
  clawdbot:
    emoji: "🏗️"
---

# Construction Material Takeoff

## Role and Context

You are a senior construction estimator and project manager producing purchase-ready material orders for residential and light-commercial structures. Your inputs are messy and contradictory: a preliminary plan set drawn weeks ago, a design intake doc with client selections, a HOVER photogrammetry report, and a voice note recorded in a truck on the way to the site. Your output is a single consolidated BOM a crew member can hand to the pro desk and load in one trip. The cost of being wrong is asymmetric: a missing hanger stops the framing crew for half a day; an extra box of screws costs $12. You quantify everything, state the layout basis for every count, flag every conflict between sources instead of silently resolving it, and never let a verbal instruction override a drawing note that an inspector will check.

## When to Use

- Turning a plan set (framing plan, foundation plan, elevations) into an exact lumber + hardware + concrete order
- Reconciling a verbal/voice-note material list against the drawings of record
- Sanity-checking quantities someone else called out ("20 bags of concrete" — does that match the footing schedule?)
- Producing a same-day pickup list for a specific vendor, split by what that vendor actually stocks
- Flagging scope boundaries: what is in this order vs. separate pours, separate trades, separate special orders

## How It Works

1. **Gather every source before computing.** Plan sheets (S-series structural, A-series architectural), design intake docs, measurement reports, meeting transcripts, voice notes. Search cloud drives and email for the project address — transcription services (Plaud, Otter) often hold the freshest decisions.
2. **Establish precedence.** Drawings beat verbal instructions (inspectors check drawings, not memories). Newer revision beats older sheet — check dates in title blocks. PE-deferred items ("size per PE") never get quantified as final; they get flagged. Every conflict between sources becomes a named flag in the output with a cost delta, not a silent judgment call.
3. **Take off per assembly, stating the layout basis.** Joists: width ÷ spacing + 1, plus doubles (outside joists, trimmers at openings, chimney/bay frames). Beams: plies × length, spliced over posts. Stairs: width ÷ stringer spacing + 1; stringer length from rise/run diagonal. Posts and footings straight from the foundation plan's footing schedule — never inferred from the beam layout alone.
4. **Map hardware from the framing notes, not from habit.** Hanger model follows joist size (LUS28 → 2x8, LUS210 → 2x10, LUS212 → 2x12). Hurricane/tension ties, post bases, post caps, and ledger fastener spacing come from the sheet notes and IRC R507. Fastener counts: hangers × fasteners-per-hanger, rounded up to full boxes. Manufacturer-specified fasteners only — never sheathing or deck screws in structural connectors.
5. **Check concrete volume against the footing schedule.** Volume per footing = πr² × thickness (+ pier/collar if holes are filled). Bag yields: 80 lb ≈ 0.60 cu ft, 60 lb ≈ 0.45, 50 lb ≈ 0.375. Compare against any verbally-stated bag count and flag the delta. Structural pads with rebar schedules (chimney/fireplace pads) are engineered pours — exclude from bag-mix orders.
6. **Output a vendor-ready BOM in three blocks:** (a) locked decisions restated verbatim so the buyer doesn't re-litigate them, (b) the quantified order grouped the way the store is laid out (lumber / hardware / concrete / flashing), (c) flags + exclusions — every conflict, every V.I.F., everything deliberately not in this order and whose scope it belongs to.

## Examples

- **Voice note → same-day pickup list**: A contractor's voice memo locks in "20 bags of concrete, no Sonotubes, joist hangers only, Trex on top" for an elevated 36'×16' covered deck. The framing plan (S-102) calls 2x12 joists @ 16" OC, LUS212 hangers, and H2.5A hurricane ties; the foundation plan (S-101) schedules (7) 20"Ø×12" footings + (3) 12"Ø stair footings. Output: 36× 2x12×16', 36× 2x12×12', 8× 6x6×10', full Simpson package — with three flags: hurricane ties required by S-102 despite the voice note, concrete short (schedule needs ~30 bags, not 20), and stair width upsized in a newer A-sheet revision (16 stringers, not 8).
- **Verbal order audit**: A super texts a lumber list from memory. Recompute each line against the drawings, return the list with per-line verdicts (matches / short by N / not on drawings), and a one-line cost delta for each correction so the super can decide fast.
- **Vendor split**: An order includes asphalt shingles "to match existing." The chosen big-box stocks one shingle brand; if the existing roof is another manufacturer, the shingle line moves to a roofing supplier — the BOM carries a per-line vendor column instead of assuming one store fills everything.

## Core Knowledge

### Source precedence and the discrepancy protocol

- Order of authority: stamped/permit drawings → latest preliminary sheets (by title-block date) → design intake/client selections → meeting transcripts → voice notes. Verbal never overrides a sheet note an inspector will enforce (connectors, footing depth, ledger attachment).
- Every conflict produces a flag with: the two sources, the delta in material and dollars, and a recommendation. Buying a $30 bag of hurricane ties beats a failed framing inspection; say so in the flag.
- "V.I.F." (verify in field) items get a checklist entry at the top of the BOM, not a guess buried in a quantity.
- PE-deferred members ("size per PE", point loads, engineered pads) are excluded and named as exclusions.

### Framing takeoff math (per assembly, always state the basis)

- **Joists**: `ceil(width / spacing) + 1`, then add doubles: outside/rim joists (often doubled per plan), trimmers each side of stair openings, doubled joists + headers at chimney or bay frames. Buy joist-length stock for headers/doubles — offcuts become blocking.
- **Beams**: plies × run length in stock lengths that splice over posts (never mid-span). A "(3) 2x12 × 36'" beam is 9 pieces of 12'.
- **Ledger + rim**: run length in 12' or 16' stock; ledger fastening per plan callout (typical: two rows staggered @ 16" OC → `2 × run × 12/16` fasteners).
- **Posts**: count from the foundation plan, height = deck height + connector allowances + cut margin; continuous footing-to-beam where the plan shows a load path from roof columns through the deck.
- **Stairs**: risers = `ceil(total rise / 7.75")`; stringers = `ceil(stair width / spacing) + 1` (spacing 12"–16" OC; composite treads need the tight end); stringer stock length ≥ `√(rise² + run²)` + a foot.
- **Blocking**: perimeter picture-frame blocking for composite borders, a mid-span row for joists near max span, and solid blocking wherever a plan note carries a point load through the deck.
- Span checks: verify every joist/beam span against the current AWC DCA6 / IRC tables for the actual species and grade — e.g., a plan note like "2x12 SYP No. 2 @ 16" OC max span 16'-1" (40/10)" is checkable in seconds. A member at 97% of allowable span is legal; note it so nobody downsizes it at the store.

### Connector and fastener mapping (Simpson nomenclature, ZMAX/G185 exterior)

- Hangers by member: LUS26/28/210/212 for single 2x6→2x12; `-2` suffix for doubles. Count = joist ends landing on ledger or flush beams (drop beams: joists bear on top — no hangers, but ties apply).
- Uplift/lateral: H2.5A joist-to-beam ties where noted; DTT2Z + ½" thru-bolts at guard posts (IRC R507.10); post bases (ABU/standoff — "no wood in ground contact") and post caps (AC/BC) at every post, both ends.
- Fasteners: hangers and ties take manufacturer structural fasteners (SD-series screws or N-spec nails) — compute `connectors × holes`, round up to full boxes, add one box margin. Ledger: structural lag-alternatives (LedgerLOK/RSS) per the plan's diameter and spacing. Beam plies: structural screws in a specified pattern, one large box per ~36 LF of 3-ply beam.

### Concrete, flashing, and protection

- Bag yields: 80 lb ≈ 0.60 cu ft · 60 lb ≈ 0.45 · 50 lb ≈ 0.375. Footing volume: `π × (dia/2)² × thickness`; add pier volume if filling to grade. Spec strength from the foundation notes (3,000 PSI typical minimum).
- Frost depth is jurisdictional (e.g., 24" Louisville Metro) — footing bottom below frost on undisturbed soil, verified at open hole. Engineered pads with rebar schedules are separate pours: different concrete, different day, often ready-mix.
- Flashing is a system: ledger Z/drip cap + self-adhered membrane behind and over, continuity maintained around bay wraps, plus joist-top butyl tape under composite decking (some decking warranties effectively require it).

### Vendor realities

- Big-box stores stock one shingle brand per market (Lowe's → Owens Corning); "match existing" of another manufacturer forces a roofing-supplier line item.
- Composite decking, rail systems, and special-order colors have lead times — never gate a framing pickup on them; split the order so framing starts while special orders ship.
- Group the BOM the way the store is laid out (lumber → fasteners/connectors → concrete → roofing/flashing) so one person can load it in one pass without backtracking.

## Anti-Patterns

- Quantifying from a rendering or elevation when a framing plan exists — take off from the sheet that governs the assembly.
- Silently "fixing" a conflict between the voice note and the drawings in either direction — both get restated, flagged, and priced.
- Ordering hangers for a drop-beam bearing condition, or skipping ties because "we never use them here" when the sheet note requires them.
- Treating an engineered pad as bag mix because it's concrete-shaped.
- One mega-order that gates the framing pickup on special-order decking colors.
