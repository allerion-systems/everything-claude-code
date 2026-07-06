---
name: sketchup-cloud-modeling
description: Drive the Trimble SketchUp cloud MCP server end-to-end - session lifecycle, sandboxed Python geometry, building from measured/as-built data, saving .skp deliverables, and producing permit drawings from the model. Use for any "design/edit/build it in SketchUp" request.
origin: ECC
---

# SketchUp Cloud Modeling (Trimble SketchUp MCP)

Operate the cloud SketchUp MCP server reliably across sessions: connect, model with
sandboxed Python, verify with snapshots, save .skp files, and turn the model into
client/permit deliverables.

## When to Use

- Any request to design, build, or edit a 3D model in SketchUp from this chat
- Turning an address / as-built data / HOVER export into a modeled design
- Producing .skp deliverables the client opens at app.sketchup.com or SketchUp desktop
- Generating drawing views (elevations, plans, scenes) from the model

## How It Works

### 1. Finding the server (it renames itself)

The server's tools are `build_model`, `save_model`, `list_skills`, `read_skill`,
`usage_limit_reached`. The MCP server name is NOT stable — it can appear as
`mcp__Trimble_SketchUp__*` or as a UUID prefix (e.g. `mcp__0c0d7fb3-...__*`), and it
can rename mid-session after a reconnect. Always locate it with ToolSearch
(`"select:..."` by exact name, or keyword search `"sketchup build model"`) instead of
assuming a prefix from memory or from an agent file.

### 2. Permission gate (the #1 time sink)

- `list_skills` / `read_skill` are read-only and run WITHOUT approval.
- `build_model` / `save_model` are MUTATING and each call may require the user to tap
  **Allow** on a permission prompt. If a call fails with
  "MCP tool call requires approval", that is a client-side gate — do NOT retry in a
  loop. Tell the user plainly: one tap on **Always allow** makes it permanent for the
  connector. Retry after the user signals, or once per wake in autonomous loops.
- There is no credential to store. The connector is authorized at the claude.ai
  account level; never ask for or store SketchUp passwords/tokens.

### 3. Mandatory pre-flight (every session, before first build_model)

1. `list_skills` (free), then `read_skill` for EVERY baseline skill:
   `sketchup-sdk`, `sketchup-clean-geometry`, `sketchup-components`,
   `sketchup-assembly-structure`, `sketchup-camera`, `sketchup-styles`,
   `sketchup-solid-cleanup`. Read contextual skills that match the task:
   `sketchup-scenes` (multi-view files), `sketchup-part-boundaries` (framing/joinery),
   `sketchup-rounded-corners` (close-up furniture edges).
2. Pass `clean: true` on the first `build_model` of a NEW task — sessions persist
   ~30 min idle / 6 h max, and stale model state from a prior conversation may still
   be loaded. Do NOT pass `clean` when iterating within the same task.
3. After ANY reconnect or server rename, assume the model may be gone: probe first
   (list group names/counts via a tiny `build_model`), and only then decide between
   incremental edit and full rebuild.

### 4. Sandbox rules (violations fail at AST validation)

- Python, INCHES only, no imports of any kind (`math` and all SDK classes are
  pre-loaded), no filesystem, no `exec/eval/type/setattr/open/__import__`, no dunder
  reflection. `Exception` is available for try/except.
- `build_model` is NOT transactional — a mid-script exception leaves partial state.
  Check `model_snapshot.totals` / `.groups` / `.bounding_box` after every call;
  wrap risky segments in try/except or split into smaller calls.
- `session_state` dict persists across `build_model` calls (cleared by `clean:true`
  or model recreation) — stash helpers and accumulated data there.
- Return data via `result = {...}` (JSON-serializable only; convert SDK objects).
- Core idioms: `group = Group(); model.get_entities().add_group(group)` BEFORE
  filling; `_, geom = geom.add_face(loop)`; `fill(geom, weld_vertices=True)`;
  openings = inner loops with reversed winding (never split walls);
  `entities.erase_entities([...])`; materials = configure `Material()` first, then
  `model.add_materials([mat])`, apply face-by-face (group-level set_material does not
  render reliably); no built-in .skm materials in the cloud — solid colors only;
  transforms are flat-16 column-major `SUTransformation`; camera via
  `cam.enable_perspective(True)` + `set_orientation(eye, target, up)` +
  `model.set_camera(cam)` before save.

### 5. Building from measured / as-built data

- Exact geometry (HOVER exports, surveys, point data) goes in as coordinate literals
  embedded in the Python code — the cloud tool CANNOT import .skp/.obj/.glb/JSON
  files. Keep the verified geometry in a JSON file in the project repo/folder and
  paste vertex arrays into the build code.
- When rebuilding faces from edge/line soup: CHAIN segments end-to-end (match shared
  endpoints, flipping as needed) — never take raw first-endpoints in path order.
  Verify with a Newell-area comparison against source data (target: ~0.000%
  deviation). Naive ordering silently produces garbage polygons.
- Define one local coordinate frame early (e.g. x=0 at a named wall feature, y=0 at
  the wall plane, z=0 grade), write it into the project spec file, and convert to the
  client file's native frame only at delivery time.

### 6. Deliverables (.skp) and the File → Insert pattern

- `save_model({filename})` returns a download URL + thumbnail; the session stays
  alive by default (`keep_session: false` only when done iterating).
- You cannot push geometry into the USER'S open browser tab, and the cloud tool
  cannot ingest their .skp. The delivery pattern that works: save a
  PROPOSED-DESIGN-ONLY .skp in the client file's native coordinate frame, plus an
  ALIGN_MARKER (small cross at a known landmark, e.g. a door jamb at grade). The
  user opens their as-built file and does **File → Insert** of your file — geometry
  lands in place; if origins differ, one snap-move on the marker aligns everything.
  Also save a combined existing+proposed preview .skp with scene tabs.

### 7. Address → design → drawings pipeline

1. Geometry source, in order of preference: client-provided HOVER/photogrammetry
   export (exact) → county GIS / parcel footprint + photos (approximate, label as
   such) → user-supplied measurements. Never invent openings, rooflines, or massing;
   preserve as-built openings exactly and flag conflicts instead of fudging.
2. Write a `customer_intent_spec.md` (single source of truth: massing numbers, hard
   client rules, coordinate frame, finishes) before modeling; every agent reads it.
3. Model in the cloud session: existing conditions first (verify vs source data),
   then proposed, layered (`EXISTING_*` / `PROPOSED_*` / `DEMO_*`), with scene tabs
   per required view. Verify snapshot numbers against the spec (key dims, EQ rules,
   clearances) before saving.
4. Drawing sheets: scenes/cameras in the .skp give the 3D views; dimensioned permit
   sheets (plans, framing, details, title blocks) are produced faster and cleaner
   with matplotlib/ezdxf from the same verified coordinate data than by screenshotting
   SketchUp. Keep one Python script per sheet so any sheet regenerates with one command.

## Examples

Probe a possibly-stale session before editing:

```python
groups = model.get_entities().get_groups()
names = {}
for g in groups:
    n = g.get_name(); names[n] = names.get(n, 0) + 1
result = {"group_count": len(groups), "names": names}
```

Box helper via GeometryInput (quad-faced, group-wrapped):

```python
def boxg(name, x0, y0, z0, w, d, h):
    g = Group(); g.set_name(name)
    model.get_entities().add_group(g)
    gi = GeometryInput()
    v = [(x0,y0,z0),(x0+w,y0,z0),(x0+w,y0+d,z0),(x0,y0+d,z0),
         (x0,y0,z0+h),(x0+w,y0,z0+h),(x0+w,y0+d,z0+h),(x0,y0+d,z0+h)]
    for p in v: gi.add_vertex(SUPoint3D(*p))
    for loop_idx in [(0,3,2,1),(4,5,6,7),(0,1,5,4),(1,2,6,5),(2,3,7,6),(3,0,4,7)]:
        li = LoopInput()
        for i in loop_idx: li.add_vertex_index(i)
        _, gi = gi.add_face(li)
    g.get_entities().fill(gi, weld_vertices=True)
    return g
session_state["boxg"] = boxg   # reuse in later calls
```

Failure triage: "requires approval" → user gate, tell user to Allow (once, with
"Always allow"); `SessionExpired` → call again, model is gone, rebuild;
bounding_box exploded → transform error; group faces=0 → degenerate/non-coplanar
verts; material count short → duplicate name silently dropped geometry.
