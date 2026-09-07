---
name: hover-construction-drawings
description: >-
  Generate permit-ready residential framing and roof plan sets from HOVER
  (hover.to) photogrammetry measurements using the dependency-free Node
  pipeline in scripts/hover/. Covers pulling any HOVER job on demand,
  adapting measurement JSON to the neutral plan model, and emitting DXF +
  title-block SVG sheets. TRIGGER when: user mentions HOVER, roof plans,
  framing plans, permit drawings, or converting exterior measurements into
  construction documents. DO NOT TRIGGER for interior architectural design,
  structural engineering calculations, or non-HOVER CAD work.
origin: community
---

# HOVER Construction Drawings

Turn a HOVER capture into a drawing set — S-1 Roof Plan, S-2 Roof Framing
Plan, S-3 Wall Framing Elevations & Schedules, plus S-4 Deck Framing Plan
when the model includes a deck — through chat, at zero
marginal cost (plain Node, no external services beyond the user's HOVER
account).

## When to Use

- User asks for roof plans, framing plans, or a permit set from a HOVER job
- User wants to browse or pull HOVER projects ("grab the Smith reroof")
- User has HOVER measurement JSON/PDF and wants CAD deliverables
- `/hover` command invocations

**Do not use** for interior floor plans from scratch, structural load
calculations, or stamping/approval questions beyond pointing to a licensed
professional.

## How It Works

The pipeline is three dependency-free Node scripts (Node 18+):

1. **Pull** — `node scripts/hover/hover-api.js pull <job_id>` downloads
   `job.json`, measurement JSONs (`summarized_json`, `full_json`,
   `roof_lines`), and HOVER's own artifacts (measurement PDF, DXF/SKP CAD
   exports when the deliverable includes them) into
   `hover-projects/<job_id>/`. `jobs <search>` finds any project instantly.
   See `references/hover-api.md` for endpoints and auth.
2. **Adapt** — `scripts/hover/plan-model.js` normalizes input to the neutral
   plan model (schema documented in its file header; coordinates in decimal
   feet, plan view). HOVER payloads with facet/line geometry auto-convert,
   including inch→foot detection. If normalization exits with NEEDS_ADAPTER,
   YOU read the HOVER JSON and write the neutral model yourself — that is the
   designed fallback, not an error to give up on.
3. **Generate** — `node scripts/hover/generate-plans.js <model.json> --out
   <dir> --date <today>` renders each sheet as model-space DXF (feet) and an
   ARCH D SVG plot sheet with border, title block, legend, schedules, notes,
   and the NOT FOR CONSTRUCTION disclaimer. `--sheets` selects a subset from
   `roof,roof-framing,walls,deck` (default: all). Drafting conventions live
   in `references/drafting-standards.md`.
4. **Model (optional)** — `node scripts/hover/sketchup-code.js <model.json>
   [--topo site-topo.json]` emits ready-to-run build code for the Trimble
   SketchUp MCP connector (walls, roof, deck, and USGS terrain); the
   **sketchup-modeler** agent relays it and returns a downloadable `.skp`.
   Protocol and verification values in `references/sketchup-modeling.md`.

### Pre-visit site scout (address -> as-built conditions before HOVER)

`node scripts/hover/site-scout.js "<address>"` uses free public GIS (US
Census geocoder, USGS 3DEP elevation, OpenStreetMap footprints — no keys,
no cost) to produce `site-topo.json` plus a starter `plan-model.json` with
the existing building footprint, clearly flagged as a GIS approximation.
Drawings and a terrain-sitting SketchUp massing exist before anyone drives
to the site; the HOVER capture later replaces the approximation with
measured geometry. `site-topo.js` alone fetches just the terrain grid.

### Deck pickup (HOVER does not measure decks)

HOVER's photogrammetry measures walls/roofs/openings but NOT decks — the
deck appears in capture photos only. Procedure:

1. `hover-api.js pull` downloads capture photos to `photos/` automatically.
2. Read the photos that show the deck alongside a HOVER-measured element
   (facade length, door/window width). Scale = known dimension ÷ its pixel
   length in that photo; apply to the deck edges to estimate width/depth/
   height. Cross-check across 2+ photos.
3. Write the `deck` section into the plan model with `"estimated": true`:
   `{ "attachedTo": "F3", "origin": [x,y], "direction": [0,1], "width": w,
   "depth": d, "height": h, "estimated": true }` (joist/beam/post specs
   optional — flagged defaults otherwise).
4. Regenerate: the set gains **S-4 DECK FRAMING PLAN** (ledger, joists,
   beam, posts, IRC R507 notes, photo-estimate warning) and the SketchUp
   model gains the 3D deck (platform, posts, guardrail on open sides).
5. Tell the user the dimensions are photo-estimated and must be tape-verified
   before material orders or permit submission.

### Design inputs

Member sizing is user input, not photogrammetry output. Gather (or default
with a VERIFY flag): rafter size/spacing, ridge member, stud size/spacing,
wall height, header preferences, jurisdiction. Defaults live in
`plan-model.js` (`DEFAULT_FRAMING`).

### Guardrails

- Never delete the sheet disclaimers; never claim the set is sealed or
  approved. Permit acceptance rules vary by jurisdiction — say so.
- Every dimension traces to HOVER data or explicit user input; assumed
  opening locations are auto-flagged with an asterisk.
- Keep the raw pull directory intact for reproducibility; regenerate instead
  of hand-editing outputs.

## Examples

### Pull a project and produce a full set

```
User: /hover plans for the job at 123 Main St, rafters 2x10 @ 24

1. node scripts/hover/hover-api.js jobs 123 Main St     -> job #17344154
2. node scripts/hover/hover-api.js pull 17344154
3. node scripts/hover/generate-plans.js \
     hover-projects/17344154/measurements-roof_lines.json \
     --out hover-projects/17344154/drawings --date 2026-07-06
   (write a neutral model first if the generator reports NEEDS_ADAPTER,
    setting framing.rafter = { size: "2x10", spacingIn: 24 })
4. Deliver: sheet paths + summary (pitch, areas, rafter count, headers).
```

### Offline / no credentials

Work from any measurement JSON the user drops in the repo: adapt it to the
neutral schema and run the generator — see
`tests/hover/fixtures/gable-plan-model.json` for a complete example model.
