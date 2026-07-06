# HOVER → SketchUp Modeling (Trimble MCP connector)

Runbook for the **sketchup-modeler** agent: turn a plan model into a live,
downloadable SketchUp model. Validated end-to-end (fixture → `.skp`).

## Pipeline

```
plan-model.json ──(scripts/hover/sketchup-code.js)──> build_model Python
                 ──(mcp__Trimble_SketchUp__build_model)──> live model
                 ──(mcp__Trimble_SketchUp__save_model)──> .skp + thumbnail URL
```

`sketchup-code.js` does all geometry math deterministically and locally:

- **Walls** — one group per facade, 5" thick (connector convention), built
  from axis-aligned quads; window/door openings punched through both faces
  with inner loops and closed with sill/header/jamb faces. Facade winding is
  normalized so local +Y always points into the building.
- **Roof** — one group per HOVER roof facet; plan-view vertices lifted to
  `wall_top + (rise/12) × distance-from-eave` (linear over the plane, so the
  3D polygon stays planar), fan-triangulated, then coplanar-merged back to a
  single face.
- **Materials** — solid colors only (cloud connector has no .skm library).
- **Camera** — bbox-derived hero view baked into the code.
- Units: generator converts plan-model feet → connector inches.

## Connector protocol (matters — calls fail otherwise)

1. Before the first `build_model` of a conversation: `list_skills`, then
   `read_skill` for every baseline skill.
2. First call of a new task: `build_model({ clean: true, code })`.
3. `build_model` is not transactional — on error, read `model_snapshot` to
   see what survived before retrying.
4. Sandbox: no `import`, `exec`, `eval`, `open`, `type`, `setattr`, no
   filesystem, no dunder access. The generator's output is already
   compliant; keep hand-written additions compliant too.
5. `save_model({ filename, keep_session: false })` when iteration is done —
   sessions expire (30 min idle) and the connector has usage caps.

## Snapshot verification (fixture reference values)

For `tests/hover/fixtures/gable-plan-model.json` expect:

| Check | Expected |
| --- | --- |
| result | `{walls: 4, openings: 4, roof_planes: 2}` |
| Residence bbox | 480 × 336 × 180 in (40' × 28', ridge 15') |
| Wall_F1_SOUTH faces | 18 (6 + 3 openings × 4 closures) |
| Roof faces | 2 (fan triangles merged) |
| materials | Siding, Roofing |

A wall with 0 faces = degenerate geometry; bbox beyond expected coordinates
= transform error. Fix the plan model / generator input, not the Python.

## Division of labor

- **Generated code**: everything derivable from HOVER data. Never hand-write
  what the generator emits.
- **Hand-written follow-ups** (plain `build_model` calls, no `clean`): gable
  end infill, porches, garage doors, site slab — only when the user asks.
- **Not this pipeline's job**: permit sheets (2D generator), structural
  sizing (user/engineer), photoreal rendering.
