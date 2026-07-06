---
description: Take a property address or as-built data through the full SketchUp pipeline - model existing conditions, design the requested change, save .skp deliverables, and produce permit-ready drawing sheets.
---

# /sketchup-design

Run the full address-to-drawings pipeline for: $ARGUMENTS

Read the `sketchup-cloud-modeling` skill first — it is the operating manual for the
cloud SketchUp MCP server (tool discovery, permission gate, sandbox rules, delivery
patterns). Then execute:

## 1. Geometry source

- Best: client-provided HOVER/photogrammetry export or measured as-built data.
- Fallback: county GIS parcel footprint + photos (label everything derived from it
  as approximate, "NOT A SURVEY").
- Record the coordinate frame (x/y/z datums) and all measured geometry in a project
  folder: `customer_intent_spec.md` (hard rules, massing numbers, finishes, client
  decisions) + a JSON of exact vertices. Every later step reads only from these.

## 2. Model in SketchUp (delegate to the sketchup-modeler agent)

- Existing conditions first, verified against source data (chained-vertex rebuild,
  Newell-area check). Then the proposed design on `PROPOSED_*` layers.
- Scene tabs for each deliverable view. Verify snapshot dims vs the spec before save.
- Save: combined preview .skp + proposed-only insert .skp (native client frame +
  ALIGN_MARKER). Send both download links with File → Insert instructions.

## 3. Drawings

- 3D/presentation views come from the .skp scenes.
- Dimensioned permit/HOA sheets (cover+site, demo, framing, roof, details) are
  generated as one Python matplotlib script per sheet from the same verified
  coordinates, 17x11 landscape PDF+PNG, consistent title block, then merged into a
  single permit-set PDF. Read each rendered PNG and fix overlaps/clipping before
  accepting it (max 2 fix iterations per sheet).
- QA every sheet against the intent spec's hard rules before delivery; fail closed.

## 4. Deliver

Send the user: permit-set PDF, sheet PNGs, both .skp files, and a one-paragraph
summary of what was designed and what needs their verification (setbacks vs plat,
engineer review, permit office specifics).
