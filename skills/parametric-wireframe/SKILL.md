---
name: parametric-wireframe
description: >-
  Turn measured dimensions (from a plan set, HOVER capture, field notes, or a
  design brief) into an interactive, dependency-free 3D wireframe published as
  a Claude artifact — orbit/pan/zoom, layer toggles, saved drafting scenes
  (perspective / elevation / framing plan / section), and one-click OBJ export
  that opens in FreeCAD, Blender, or SketchUp. The open-source alternative to
  driving the SketchUp cloud connector: no MCP, no account, no build step, runs
  in any browser. TRIGGER when: user wants to model/visualize/wireframe a
  building, deck, room, or structure in 3D; wants a lightweight alternative to
  SketchUp; or asks to "3D this", "model this", or "make a wireframe". DO NOT
  TRIGGER for 2D permit drawings (use hover-construction-drawings), photoreal
  renders, or FEA/structural calculation.
origin: ECC
---

# Parametric Wireframe

Design in 3D without SketchUp. You write the geometry as measured lines in a
tiny Python DSL; the skill emits a **single self-contained HTML file** — a
Canvas 3D viewer with orbit/pan/zoom, per-system layer toggles, named camera
scenes, and OBJ export — which you publish with the Artifact tool. Everything
is code and data, so a design change is a one-line edit and a re-run, and the
file opens on any device with nothing installed.

Real example shipped with this skill: `examples/508-foxwick.py` builds the
Hernandez Residence porch & deck (existing house, demo layer, deck framing,
stair, columns, 2:12 roof, freestanding chimney, footings) from plan-set
dimensions.

## When to use

- User wants to *see* a design in 3D — a deck, porch, addition, room, massing.
- User asks for an alternative to SketchUp, or "open source", or something that
  "just works in the browser".
- You already have measured dimensions (a plan set, HOVER numbers, a section)
  and want a viewer clients can orbit — not a static image.
- You need a coordinated model where structure, finishes, and existing
  conditions toggle independently (framing review, demo scope, phasing).

Prefer `hover-construction-drawings` for 2D permit sheets, and the SketchUp
cloud skill only when the client specifically needs a native `.skp`.

## Why this instead of SketchUp

| | Parametric wireframe | SketchUp cloud connector |
|---|---|---|
| Dependencies | None — Python + a browser | MCP connector, Trimble account, usage caps |
| Edit loop | Change a number, re-run | Re-drive the connector, snapshot, save |
| Delivery | Shareable artifact URL, works on phone | `.skp` download, needs SketchUp to open |
| Interop | Exports `.obj` → FreeCAD / Blender / SketchUp | native `.skp` |
| Determinism | Same input → same file | model state drifts between sessions |

The OBJ export means this is a feeder for the whole open-source CAD stack, not
a dead end: bring the wire model into **FreeCAD** (parametric BIM, IFC export),
**Blender** (rendering, sun studies), or SketchUp itself.

## How it works

Three files under `templates/`:

- **`wireframe.py`** — the library. A `Scene` accumulates layered polylines
  (`box`, `poly`, `rect`, `grid`, `repeat`, `label`); `build()` injects the
  geometry + a config object into the viewer and writes the final HTML.
- **`viewer.html`** — the self-contained, theme-aware Canvas viewer. Reads two
  placeholders: `__MODEL__` (geometry) and `__CONFIG__` (layers, labels,
  scenes, HUD, stamp). No external requests — safe under the artifact CSP.
- **`examples/508-foxwick.py`** — a full worked build to copy from.

### Coordinate convention

`X` = left→right as the main viewer sees it · `Y` = up · `Z` = depth (toward
the viewer). Work in real units (feet here) and stay on one. Put the thing the
client cares about facing +Z.

### The build loop

1. **Gather dimensions.** Pull them from the plan set / HOVER / brief. Never
   invent structure you can't source — flag estimates the way the drawings do.
2. **Write the scene.** Copy `examples/508-foxwick.py`. Group geometry into
   layers by *system* (existing, demo, framing, deck, roof, chimney, …) so they
   toggle independently.
3. **Configure `build()`** — title, subtitle, rev, stamp, HUD lines, the
   `layers` map (label + light/dark colors + line weight + optional dash), and
   `scenes` (name → camera). Give every geometry layer a `layers` entry.
4. **Run it:** `python3 examples/<name>.py` → emits `<name>-wireframe.html`.
5. **Verify before publishing.** Render headless and eyeball it — see below.
6. **Publish** the HTML with the Artifact tool. Favicon 🧊 or 📐.

### Verify headless (do this every time)

The viewer is Canvas + JS; a bad number shows as a missing or exploded line,
not an error. Screenshot it before you publish:

```bash
node - <<'EOF'
const { chromium } = require('playwright-core');
(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  const p = await b.newPage({ viewport: { width: 1280, height: 800 } });
  const errs=[]; p.on('pageerror',e=>errs.push(e.message));
  // wrap the artifact body in a minimal doc for local viewing
  await p.goto('file://' + process.cwd() + '/preview.html');
  await p.waitForTimeout(600);
  await p.screenshot({ path: 'preview.png' });
  console.log('errors:', JSON.stringify(errs));
  await b.close();
})();
EOF
```

Chromium is preinstalled at `/opt/pw-browsers/chromium`; `npm i playwright-core`
if it isn't already present. Check the perspective and one orthographic scene.

## Scene DSL cheatsheet

```python
s = Scene()
s.box("framing", x0,y0,z0, x1,y1,z1)         # 12 edges of a box
s.poly("roof", p0, p1, p2, ...)              # open polyline
s.rect("deck", p0, p1, p2, p3)               # closed quad
s.grid("roof", p0,p1,p2,p3, nu=18, nv=1)     # ruled surface (standing seam)
s.repeat("framing", a, b, axis=0, start=0, count=28, step=16/12)  # joists @16" o.c.
s.label("STONE CHIMNEY", x, y, z, "chimney") # 3D-anchored text
```

`pitch_height(rise, run, base_y, z)` gives roof height at a depth for sloped
planes. Line weight and dash come from the `layers` map, so demo/estimated
layers can read dashed (`[6,4]`) without touching geometry.

## Guardrails

- **Source every dimension.** This produces something that *looks*
  authoritative. Keep the `stamp` honest ("PRELIMINARY — NOT FOR CONSTRUCTION —
  V.I.F.") until a licensed professional signs off, exactly as the plan set does.
- **Reconcile with the drawings.** If a plan set exists, the model must match
  it (deck height, riser count, pitch, which side the garage is on). A wireframe
  that contradicts the controlling document is worse than none.
- **Ground the existing shell in the capture — never invent the roof.** When a
  HOVER capture exists, pull the *existing* roof from it: pitches from
  `roof.pitch[]` (e.g. a 7:12 hip with a 12:12 gable wing — model the real
  facets, not one assumed slope), and eave/ridge/wall/sill heights from the DXF
  (HOVER exports are in **inches** — ÷12) or the measurement PDF. A guessed
  pitch or a hip drawn as a gable is the most common reason a model "doesn't
  match." The `508-foxwick.py` example is built this way.
- **Covered-porch roofs are hips, not awnings.** A porch roof on a two-storey
  wall ties in as a **hip tucked just under the second-floor sills**; its pitch
  is *derived* from (sill − outer-beam height) ÷ depth, not chosen. Echo the
  existing roof's vocabulary (hip vs gable) and the client's inspiration.
- **One unit system.** Mixing feet and inches silently scales the model.
- **Keep it a wireframe.** No fills, no lighting — legibility of the structure
  is the point. For renders, export OBJ and light it in Blender.
- **Self-contained only.** No CDN, no fonts, no fetch — it must survive the
  artifact CSP. The template already obeys this; don't add external assets.

## Extending

- New building type: copy the example, swap the layer taxonomy, keep the DSL.
- More scenes: add camera dicts (`yaw`, `pitch` in radians; `dist`, `fov`;
  `tgt` look-at). Orthographic-ish views use a narrow `fov` + large `dist`.
- Dimensions/annotations: add a `dims` layer of thin polylines with `label`s.
- Round geometry (columns, arcs): approximate with short `poly` segments.
