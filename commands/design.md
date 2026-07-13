---
description: Design a deck or covered-deck/porch project end to end from a HOVER capture — measured existing shell, code-checked deck + roof framing, permit-ready 2D sheets, and an interactive 3D wireframe. The existing roof and heights come from the capture, never assumed.
---

# Design Command

`/design <address, HOVER job, or project brief>`

Takes a deck or **covered** deck/porch project from capture to a coordinated
deliverable: permit-ready construction drawings **plus** an interactive 3D
wireframe the client can orbit. It orchestrates two skills that already live in
this plugin — no new tooling, no SketchUp account:

- **`hover-construction-drawings`** → the 2D permit set (Roof Plan, Roof
  Framing, Wall Framing, and **Deck Framing** sheets) from HOVER measurements.
- **`parametric-wireframe`** → the 3D wireframe artifact (orbit/pan/zoom, layer
  toggles, drafting scenes, OBJ export).

## The one rule that makes it match reality

**The existing shell is measured, not guessed.** The single most common failure
is inventing the roof — a made-up pitch, a shed where the house wants a hip.
Pull the geometry from the HOVER capture every time:

- **Roof pitch(es)** from `roof.pitch[]` in the measurement JSON (e.g. a 7:12
  hip with a 12:12 gable wing — use the real facets, not one assumed slope).
- **Eave / ridge / wall heights** from the DXF (HOVER exports are in **inches** —
  divide by 12) or the measurement PDF.
- **Second-floor sill height** sets where a covered-porch roof ties in: a porch
  roof on a two-storey wall is a **hip tucked just under the sills**, and its
  pitch is *derived* from (sill − outer-beam height) ÷ depth — it is not a
  number you pick.

If a drawing contradicts the capture, the drawing is wrong. Reconcile to the
capture before publishing.

## What it does

1. **Pull the capture.** `hover-api.js jobs <search>` → `pull <job_id>`, or work
   from measurement JSON/DXF/PDF the user drops in. Extract pitches, facet
   layout, eave/ridge/wall/sill heights (see the rule above).
2. **Deck pickup.** HOVER does **not** measure decks — scale them from the
   capture photos against a known HOVER dimension, write the `deck` block with
   `"estimated": true`, and tell the user to tape-verify before ordering or
   permitting (IRC R507).
3. **Covered-porch roof.** Model it as a hipped roof tied in under the measured
   sills; add the beam/ledger, rafters, columns, and any freestanding chimney.
4. **2D sheets.** Run `generate-plans.js` for the permit set (DXF + ARCH-D SVG,
   title block, schedules, NOT-FOR-CONSTRUCTION disclaimer).
5. **3D wireframe.** Build the `parametric-wireframe` scene from the *same*
   numbers, verify headless, and publish the artifact.
6. **Deliver** the sheet paths + the wireframe link + a dimension summary.

## Usage

```
/design 508 Foxwick — covered deck from the HOVER capture, 2x12 joists @16
/design this porch, just the 3D wireframe for the client
/design the deck in job 22357787, permit set + OBJ for FreeCAD
```

## Guarantees

- **Measured, not assumed.** Existing roof and heights trace to the HOVER
  capture; deck dimensions are photo-estimated and flagged for tape verify.
- **Code-aware.** Deck framing follows IRC R507; guards/stairs per R311/R312.
  Member sizing is user input with a VERIFY flag, not photogrammetry output.
- **Honest stamp.** Stays PRELIMINARY — NOT FOR CONSTRUCTION — V.I.F. until a
  licensed professional seals it. Permit acceptance varies by jurisdiction.

> Note: `/design` is the deck/covered-deck orchestrator. For a raw HOVER permit
> set use `/hover`; for just the 3D model use `/wireframe`. (The built-in model
> switcher already owns that other name.)

See `skills/hover-construction-drawings/SKILL.md` and
`skills/parametric-wireframe/SKILL.md` for the underlying pipelines.
