# HOVER → Construction Drawings

Chat-driven construction drawing agent: pull any HOVER (hover.to) project on
demand and turn its photogrammetry measurements into a framing/roof plan set
you can take to the permit counter.

**Cost to run: $0 beyond what you already pay.** The pipeline is three
dependency-free Node scripts executed by Claude Code under your existing
subscription, and HOVER calls use your existing HOVER account. No third-party
APIs, no npm installs, no cloud services.

## What you get

For every project, three sheets — each as **DXF** (real CAD, opens in
AutoCAD/LibreCAD/DraftSight) and **SVG** (ARCH D 36×24 title-block sheet;
print to PDF at 100% for a to-scale drawing):

- **S-1 ROOF PLAN** — ridges/hips/valleys/eaves/rakes with legend, pitch per
  plane, overall dimensions, roof area schedule (plan + slope square feet)
- **S-2 ROOF FRAMING PLAN** — rafter layout at your spacing with callouts,
  ridge/hip/valley members, code-aware framing notes
- **S-3 WALL FRAMING ELEVATIONS & SCHEDULES** — stud elevations per facade,
  window/door rough openings, header marks + header schedule

- **S-4 DECK FRAMING PLAN** (when a deck is in play) — ledger, joist layout,
  beam + posts, IRC R507 notes. HOVER doesn't measure decks, so the agent
  estimates deck dimensions from HOVER's own capture photos (scale taken
  from measured elements in frame) and flags them for field verification.

Plus, optionally, a **live 3D SketchUp model** (`/hover model`): the
sketchup-modeler agent runs `scripts/hover/sketchup-code.js` (deterministic,
local, free) and feeds the result to the free Trimble SketchUp connector —
you get a downloadable `.skp` with walls, cut openings, sloped roof planes,
the deck, and real USGS terrain under it all. Enable the Trimble SketchUp
connector in your claude.ai connector settings; note it has its own
free-tier usage caps.

And a **materials takeoff + preliminary estimate** (`/hover estimate`): the
construction-estimator agent runs `scripts/hover/estimate.js` against the
same plan model to compute roof squares by pitch, ridge/eave/rake/hip/valley
lengths, rafter and stud counts, siding net of openings, and deck materials,
then prices everything against your price book with explicit waste, overhead
& profit, and tax inputs. Output is `estimate.json` + `estimate.csv` +
`estimate.md`. Until you supply real unit costs
(`node scripts/hover/estimate.js --print-prices > my-price-book.json`, edit,
pass with `--prices`), lines are priced with flagged PLACEHOLDER values —
and every estimate is stamped **PRELIMINARY — NOT A BID**.

## Before the site visit: address → as-built conditions

```bash
node scripts/hover/site-scout.js "123 Main St, Springfield, IL"
```

Free public GIS, no keys: US Census geocoder (address → coordinates), USGS
3DEP (terrain elevation grid), OpenStreetMap (existing building footprint).
Output is `site-topo.json` + a starter `plan-model.json` — enough to
generate outline drawings and a SketchUp massing on real terrain before
anyone drives to the site. Everything is flagged as a GIS approximation;
the HOVER capture is the measured source of truth that replaces it.

## One-time setup

1. **HOVER API credentials** (uses your HOVER account): request API access /
   create an OAuth app at [developers.hover.to](https://developers.hover.to)
   (HOVER support enables this for pro/org accounts), then set:

   ```bash
   export HOVER_CLIENT_ID="..."
   export HOVER_CLIENT_SECRET="..."
   export HOVER_REFRESH_TOKEN="..."   # from the one-time OAuth code exchange
   ```

   Tokens auto-refresh and persist in `~/.claude/hover-credentials.json`
   (HOVER rotates refresh tokens; the client handles it). For a quick trial,
   `export HOVER_ACCESS_TOKEN="..."` works for 2 hours.

2. **Node 18+** — already required by this repo. Nothing to install.

3. Sanity check:

   ```bash
   node scripts/hover/hover-api.js whoami
   ```

## Using it from chat

```
/hover projects smith                  # find the job
/hover pull 17344154                   # grab measurements + HOVER artifacts
/hover plans 17344154 rafters 2x10 @ 24, studs 2x6 @ 16, wall height 9
```

or just talk: *"pull my hover job on maple street and turn it into framing
and roof plans"*. The **construction-drafter** agent runs the scripts,
adapts the measurement JSON when needed, and reports areas, pitches, rafter
counts, and file paths.

## Using the scripts directly

```bash
# list / search jobs
node scripts/hover/hover-api.js jobs 123 Main St

# pull a job (job.json, measurement JSONs, PDF/DXF/SKP artifacts)
node scripts/hover/hover-api.js pull 17344154

# generate the sheet set
node scripts/hover/generate-plans.js \
  hover-projects/17344154/measurements-roof_lines.json \
  --out hover-projects/17344154/drawings --date 2026-07-06
```

No HOVER account handy? Feed the generator a plan-model JSON directly —
`tests/hover/fixtures/gable-plan-model.json` is a complete example, and the
schema is documented at the top of `scripts/hover/plan-model.js`.

## How measurements become drawings

1. `hover-api.js pull` downloads every measurement version HOVER offers for
   the job (`summarized_json`, `full_json`, `roof_lines`) plus HOVER's own
   PDF/CAD artifacts when your deliverable includes them.
2. `plan-model.js` normalizes geometry into a neutral plan model (decimal
   feet, plan view, classified roof edges). HOVER facet/line payloads
   auto-convert — including inch→foot detection. Anything unrecognizable
   triggers a NEEDS_ADAPTER message and the agent maps the JSON itself.
3. `generate-plans.js` lays out each sheet, picks the largest standard
   architectural scale that fits ARCH D, and writes DXF + SVG.

## The permit question, honestly

These sheets are generated as **permit-ready in format** (title block,
scales, schedules, notes) but stamped **PRELIMINARY — NOT FOR CONSTRUCTION**
because:

- HOVER geometry is photogrammetry — accurate, but it must be field-verified.
- Structural member sizes (rafters, headers, studs) are *your* inputs. The
  defaults printed on the sheets are placeholders flagged VERIFY, to be
  confirmed against your code's span/header tables or your engineer.
- Whether a jurisdiction accepts contractor-prepared drawings or requires a
  licensed design professional's seal varies. Many accept sets like these
  for simple residential scopes; check with your building department.

The agent will never strip those notes — they're what makes the set credible
to a plan reviewer.
