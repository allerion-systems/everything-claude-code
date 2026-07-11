---
description: Turn measured dimensions into an interactive 3D wireframe artifact — orbit/pan/zoom, layer toggles, drafting scenes, OBJ export. Dependency-free, no SketchUp. Invokes the parametric-wireframe skill.
---

# Wireframe Command

`/wireframe <address, plan set, or design brief>`

Builds an interactive 3D wireframe of a building or structure and publishes it
as a shareable artifact — the open-source alternative to driving the SketchUp
connector. Runs on the **parametric-wireframe** skill: plain Python geometry →
a single self-contained HTML viewer, no MCP, no account, no build step.

> Heads up: `/model` is reserved by Claude Code for switching models, so this
> command is `/wireframe`. Natural language works too — "3D this deck",
> "wireframe the porch", "model this in the browser".

## What it does

1. **Gathers dimensions** from whatever you point it at — the R1 plan set, a
   HOVER capture, a section, or a written brief. It reuses numbers already in
   the project rather than re-measuring.
2. **Writes the scene** in the `Scene` DSL (`skills/parametric-wireframe/`),
   grouping geometry into toggle-able systems: existing conditions, demo,
   framing, deck, roof, chimney, footings.
3. **Emits a self-contained viewer** with orbit/pan/zoom, per-layer
   checkboxes, saved camera scenes (perspective · elevation · framing plan ·
   section), a HUD of key dimensions, and a **Download .OBJ** button that opens
   in FreeCAD, Blender, or SketchUp.
4. **Verifies headless** (Chromium screenshot) so a bad number can't ship
   silently, then **publishes** the artifact and returns the link.

## Usage

```
/wireframe 508 Foxwick — build from the R1 plan set
/wireframe this deck, framing scene only
/wireframe the addition in the brief, then export OBJ for FreeCAD
```

## Guarantees

- **Matches the drawings.** If a plan set governs, the model is reconciled to
  it (deck height, riser count, roof pitch, garage side) before publishing.
- **Honest stamp.** Stays marked PRELIMINARY — NOT FOR CONSTRUCTION — V.I.F.
  until a licensed professional signs off.
- **Zero lock-in.** OBJ export feeds the whole open-source CAD stack; the
  artifact itself works on any device with nothing installed.

See `skills/parametric-wireframe/SKILL.md` for the DSL, the worked
`508-foxwick.py` example, and the verify-before-publish loop.
