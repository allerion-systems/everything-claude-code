#!/usr/bin/env node
/**
 * Generate SketchUp build code (Python for the Trimble SketchUp MCP
 * connector's build_model tool) from a plan model — the "HOVER straight
 * into SketchUp" bridge.
 *
 * All geometry math happens here, deterministically and for free; the agent
 * only relays the generated code to the connector. Output model:
 *
 *   Residence (group)
 *     ├── Wall_<id>[_<name>] per facade — 5" thick, quad faces, window/door
 *     │   openings cut with inner loops + jamb/header/sill closure faces
 *     └── Roof (group) — one 3D plane per HOVER roof facet, lifted to
 *         wall-top height and sloped per its labeled pitch
 *
 * Also embeds a bounding-box-derived hero camera. Units: SketchUp inches
 * (plan model is decimal feet; converted here).
 *
 * Usage:
 *   node scripts/hover/sketchup-code.js <plan-model.json> [--units ft|in] [--out file.py]
 *
 * Known v1 limits (documented for the agent): roof planes are massing
 * surfaces (no fascia/thickness), triangulation assumes convex facets, and
 * triangular gable-end infill walls are not generated.
 */

const fs = require('fs');
const pm = require('./plan-model');

const WALL_THICKNESS_IN = 5; // connector convention: walls are always 5" thick

function parsePitchRise(pitch) {
  const m = /(\d+(?:\.\d+)?)\s*[/:]\s*12/.exec(String(pitch || ''));
  return m ? Number(m[1]) : 0;
}

function signedArea(points) {
  let sum = 0;
  for (let i = 0; i < points.length; i++) {
    const [x1, y1] = points[i];
    const [x2, y2] = points[(i + 1) % points.length];
    sum += x1 * y2 - x2 * y1;
  }
  return sum / 2;
}

function findEaveLine(plane, edges) {
  const onPlane = edge =>
    plane.vertices.some(v => pm.dist(v, edge.from) < 0.5) &&
    plane.vertices.some(v => pm.dist(v, edge.to) < 0.5);
  let best = null, bestLen = -1;
  for (const e of edges.filter(e => e.type === 'eave' && onPlane(e))) {
    const l = pm.dist(e.from, e.to);
    if (l > bestLen) { bestLen = l; best = [e.from, e.to]; }
  }
  if (best) return best;
  for (let i = 0; i < plane.vertices.length; i++) {
    const a = plane.vertices[i];
    const b = plane.vertices[(i + 1) % plane.vertices.length];
    const l = pm.dist(a, b);
    if (l > bestLen) { bestLen = l; best = [a, b]; }
  }
  return best;
}

function distToLine(point, [a, b]) {
  const dir = pm.unit(pm.sub(b, a));
  const rel = pm.sub(point, a);
  return Math.abs(rel[0] * dir[1] - rel[1] * dir[0]);
}

const f = n => Number(n.toFixed(3));

/**
 * Build the per-facade wall spec: origin, rotation, length, openings —
 * oriented so local +Y points into the building interior.
 */
function wallSpecs(model) {
  const walls = model.walls;
  if (!walls || !(walls.facades || []).length) return [];
  const ccw = walls.footprint ? signedArea(walls.footprint) > 0 : true;
  const heightIn = walls.height * 12;

  return walls.facades.map(facade => {
    let from = facade.from, to = facade.to;
    let openings = facade.openings || [];
    const lengthFt = pm.dist(from, to);
    if (!ccw) {
      [from, to] = [to, from];
      openings = openings.map(o => ({ ...o, offset: lengthFt - o.offset - o.width }));
    }
    const dir = pm.unit(pm.sub(to, from));
    const openingsIn = openings.map(o => {
      const isDoor = String(o.type || '').toLowerCase().includes('door');
      const sill = Number.isFinite(o.sill) ? o.sill : (isDoor ? 0 : 3);
      const height = Number.isFinite(o.height) ? o.height : (isDoor ? 6.67 : 4);
      return {
        x0: f(o.offset * 12),
        z0: f(Math.max(0, sill * 12)),
        w: f(o.width * 12),
        h: f(Math.min(height * 12, heightIn - Math.max(0, sill * 12) - 6))
      };
    });
    const name = `Wall_${facade.id}${facade.name ? '_' + facade.name : ''}`.replace(/[^A-Za-z0-9_]/g, '_');
    return {
      name,
      lengthIn: f(lengthFt * 12),
      heightIn: f(heightIn),
      cos: f(dir[0]),
      sin: f(dir[1]),
      tx: f(from[0] * 12),
      ty: f(from[1] * 12),
      openings: openingsIn
    };
  });
}

/** Roof plane spec: 3D vertices in inches (z from wall top + pitch slope). */
function roofSpecs(model) {
  const baseIn = (model.walls ? model.walls.height : 8) * 12;
  return model.roof.planes.map(plane => {
    const rise = parsePitchRise(plane.pitch);
    const eave = findEaveLine(plane, model.roof.edges);
    const verts = plane.vertices.map(v => [
      f(v[0] * 12),
      f(v[1] * 12),
      f(baseIn + (rise / 12) * distToLine(v, eave) * 12)
    ]);
    return { id: plane.id, pitch: plane.pitch || 'flat', verts };
  });
}

/** Terrain spec from a site-topo.js JSON, centered under the footprint. */
function terrainSpec(topo, walls, roofs) {
  if (!topo || !Array.isArray(topo.grid)) return null;
  const xs = [], ys = [];
  for (const r of roofs) for (const [x, y] of r.verts) { xs.push(x); ys.push(y); }
  for (const w of walls) { xs.push(w.tx, w.tx + w.lengthIn * w.cos); ys.push(w.ty, w.ty + w.lengthIn * w.sin); }
  const cx = xs.length ? (Math.min(...xs) + Math.max(...xs)) / 2 : 0;
  const cy = ys.length ? (Math.min(...ys) + Math.max(...ys)) / 2 : 0;
  const stepIn = topo.stepFt * 12;
  const rows = topo.grid.length;
  const cols = topo.grid[0].length;
  const pts = [];
  for (let r = 0; r < rows; r++) {
    for (let cIdx = 0; cIdx < cols; cIdx++) {
      // grid rows run north (+y) to south; columns west (-x) to east
      pts.push([
        f(cx + (cIdx - (cols - 1) / 2) * stepIn),
        f(cy + ((rows - 1) / 2 - r) * stepIn),
        f(topo.grid[r][cIdx] * 12)
      ]);
    }
  }
  return { rows, cols, pts, datumFt: topo.datumFt };
}

/** Deck spec (inches, axis-aligned): platform, posts, guardrail. */
function deckSpec(model) {
  const deck = model.deck;
  if (!deck) return null;
  const d = Array.isArray(deck.direction) ? deck.direction : [0, 1];
  const lateral = [d[1], d[0]];
  const A = deck.origin;
  const corner = [
    Math.min(A[0], A[0] + lateral[0] * deck.width + d[0] * deck.depth),
    Math.min(A[1], A[1] + lateral[1] * deck.width + d[1] * deck.depth)
  ];
  const w = Math.abs(lateral[0] * deck.width + d[0] * deck.depth);
  const dep = Math.abs(lateral[1] * deck.width + d[1] * deck.depth);
  const beamSet = Math.min(1.5, deck.depth / 4);
  const postT = deck.width > 12 ? [1, deck.width / 2, deck.width - 1] : [1, deck.width - 1];
  const posts = postT.map(t => {
    const p = [
      A[0] + lateral[0] * t + d[0] * (deck.depth - beamSet),
      A[1] + lateral[1] * t + d[1] * (deck.depth - beamSet)
    ];
    return [f(p[0] * 12 - 2.75), f(p[1] * 12 - 2.75)];
  });
  const ledgerSide = d[1] === 1 ? 'S' : d[1] === -1 ? 'N' : d[0] === 1 ? 'W' : 'E';
  return {
    x: f(corner[0] * 12),
    y: f(corner[1] * 12),
    w: f(w * 12),
    d: f(dep * 12),
    topZ: f(deck.height * 12),
    posts,
    ledgerSide,
    guardrail: deck.guardrail !== false
  };
}

function cameraSpec(walls, roofs) {
  const xs = [], ys = [], zs = [0];
  for (const r of roofs) for (const [x, y, z] of r.verts) { xs.push(x); ys.push(y); zs.push(z); }
  for (const w of walls) { xs.push(w.tx, w.tx + w.lengthIn * w.cos); ys.push(w.ty, w.ty + w.lengthIn * w.sin); zs.push(w.heightIn); }
  if (!xs.length) { xs.push(0, 100); ys.push(0, 100); }
  const cx = (Math.min(...xs) + Math.max(...xs)) / 2;
  const cy = (Math.min(...ys) + Math.max(...ys)) / 2;
  const cz = (Math.min(...zs) + Math.max(...zs)) / 2;
  const size = Math.max(Math.max(...xs) - Math.min(...xs), Math.max(...ys) - Math.min(...ys), Math.max(...zs));
  return {
    eye: [f(cx + size * 1.05), f(cy - size * 1.35), f(cz + size * 0.85)],
    target: [f(cx), f(cy), f(cz)]
  };
}

function generateSketchupCode(model, options = {}) {
  const walls = wallSpecs(model);
  const roofs = roofSpecs(model);
  const cam = cameraSpec(walls, roofs);
  const terrain = terrainSpec(options.topo, walls, roofs);
  const deck = deckSpec(model);
  const wallData = walls.map(w =>
    `    ("${w.name}", ${w.lengthIn}, ${w.heightIn}, ${w.cos}, ${w.sin}, ${w.tx}, ${w.ty}, [${w.openings.map(o => `(${o.x0}, ${o.z0}, ${o.w}, ${o.h})`).join(', ')}])`
  ).join(',\n');
  const roofData = roofs.map(r =>
    `    ("RoofPlane_${r.id}", [${r.verts.map(v => `(${v[0]}, ${v[1]}, ${v[2]})`).join(', ')}])`
  ).join(',\n');

  const terrainBlock = !terrain ? '' : `
# --- Terrain from USGS 3DEP topo (datum ${terrain.datumFt} ft) ---
grass = get_or_create_material("Terrain", 126, 145, 106)
TROWS = ${terrain.rows}
TCOLS = ${terrain.cols}
TPTS = [${terrain.pts.map(p => `(${p[0]}, ${p[1]}, ${p[2]})`).join(', ')}]
ground = Group()
model.get_entities().add_group(ground)
ground.set_name("Terrain")
tg = GeometryInput()
tg.set_vertices([SUPoint3D(x, y, z) for (x, y, z) in TPTS])
for r in range(TROWS - 1):
    for c in range(TCOLS - 1):
        i0 = r * TCOLS + c
        i1 = i0 + 1
        i2 = i0 + TCOLS
        i3 = i2 + 1
        for tri in [(i0, i2, i1), (i1, i2, i3)]:
            lp = LoopInput()
            for i in tri:
                lp.add_vertex_index(i)
            _, tg = tg.add_face(lp)
ground.get_entities().fill(tg, weld_vertices=True)
for edge in ground.get_entities().get_edges():
    if len(edge.get_faces()) == 2:
        edge.set_soft(True)
        edge.set_smooth(True)
paint(ground, grass)
`;

  const deckBlock = !deck ? '' : `
# --- Deck (${deck.w / 12}ft x ${deck.d / 12}ft, walking surface at ${deck.topZ / 12}ft) ---
def make_quad_box(w, dd, h):
    geom = GeometryInput()
    geom.set_vertices([
        SUPoint3D(0, 0, 0), SUPoint3D(w, 0, 0), SUPoint3D(w, dd, 0), SUPoint3D(0, dd, 0),
        SUPoint3D(0, 0, h), SUPoint3D(w, 0, h), SUPoint3D(w, dd, h), SUPoint3D(0, dd, h)
    ])
    for fv in [[0, 1, 5, 4], [1, 2, 6, 5], [2, 3, 7, 6], [3, 0, 4, 7], [4, 5, 6, 7], [0, 3, 2, 1]]:
        loop = LoopInput()
        for i in fv:
            loop.add_vertex_index(i)
        _, geom = geom.add_face(loop)
    return geom

def place_box(parent, name, w, dd, h, tx, ty, tz, mat):
    box = Group()
    parent.get_entities().add_group(box)
    box.set_name(name)
    box.get_entities().fill(make_quad_box(w, dd, h), weld_vertices=True)
    box.set_transform(SUTransformation([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, tx, ty, tz, 1]))
    paint(box, mat)

lumber = get_or_create_material("Deck_Lumber", 150, 111, 74)
deck_grp = Group()
model.get_entities().add_group(deck_grp)
deck_grp.set_name("Deck")
place_box(deck_grp, "Deck_Platform", ${deck.w}, ${deck.d}, 10.75, ${deck.x}, ${deck.y}, ${f(deck.topZ - 10.75)}, lumber)
DECK_POSTS = [${deck.posts.map(p => `(${p[0]}, ${p[1]})`).join(', ')}]
for i, (px, py) in enumerate(DECK_POSTS):
    place_box(deck_grp, "Deck_Post_" + str(i + 1), 5.5, 5.5, ${f(Math.max(deck.topZ - 10.75, 6))}, px, py, 0, lumber)
${deck.guardrail ? `RAIL_SIDES = [s for s in ["N", "S", "E", "W"] if s != "${deck.ledgerSide}"]
for side in RAIL_SIDES:
    if side == "N":
        place_box(deck_grp, "Deck_Rail_N", ${deck.w}, 3, 34, ${deck.x}, ${f(deck.y + deck.d - 3)}, ${f(deck.topZ + 2)}, lumber)
    elif side == "S":
        place_box(deck_grp, "Deck_Rail_S", ${deck.w}, 3, 34, ${deck.x}, ${deck.y}, ${f(deck.topZ + 2)}, lumber)
    elif side == "W":
        place_box(deck_grp, "Deck_Rail_W", 3, ${deck.d}, 34, ${deck.x}, ${deck.y}, ${f(deck.topZ + 2)}, lumber)
    else:
        place_box(deck_grp, "Deck_Rail_E", 3, ${deck.d}, 34, ${f(deck.x + deck.w - 3)}, ${deck.y}, ${f(deck.topZ + 2)}, lumber)` : '# guardrail disabled'}
`;

  return `# Generated by scripts/hover/sketchup-code.js — HOVER plan model -> SketchUp
# Project: ${model.project.name || '(unnamed)'} ${model.project.jobId ? `(HOVER job #${model.project.jobId})` : ''}
# Units: inches. Massing model: 5" walls with cut openings + sloped roof planes.

def get_or_create_material(name, r, g, b, a=255):
    existing = {m.get_name(): m for m in model.get_materials()}
    if name in existing:
        return existing[name]
    mat = Material()
    mat.set_name(name)
    mat.set_color(SUColor(r, g, b, a))
    model.add_materials([mat])
    return mat

def paint(group, mat):
    for face in group.get_entities().get_faces():
        face.set_front_material(mat)
        face.set_back_material(mat)

def make_wall_geom(L, T, H, openings):
    """Wall slab with openings punched through both faces (inner loops) and
    closed with jamb/header/sill faces. All quads are axis-aligned."""
    verts = [
        SUPoint3D(0, 0, 0), SUPoint3D(L, 0, 0), SUPoint3D(L, 0, H), SUPoint3D(0, 0, H),
        SUPoint3D(0, T, 0), SUPoint3D(L, T, 0), SUPoint3D(L, T, H), SUPoint3D(0, T, H)
    ]
    bases = []
    for (x0, z0, w, h) in openings:
        bases.append(len(verts))
        verts += [SUPoint3D(x0, 0, z0), SUPoint3D(x0 + w, 0, z0),
                  SUPoint3D(x0 + w, 0, z0 + h), SUPoint3D(x0, 0, z0 + h),
                  SUPoint3D(x0, T, z0), SUPoint3D(x0 + w, T, z0),
                  SUPoint3D(x0 + w, T, z0 + h), SUPoint3D(x0, T, z0 + h)]
    geom = GeometryInput()
    geom.set_vertices(verts)

    front = LoopInput()
    for i in [0, 1, 2, 3]:
        front.add_vertex_index(i)
    fi, geom = geom.add_face(front)
    for b in bases:
        inner = LoopInput()
        for i in [b + 0, b + 3, b + 2, b + 1]:
            inner.add_vertex_index(i)
        geom = geom.face_add_inner_loop(fi, inner)

    back = LoopInput()
    for i in [4, 5, 6, 7]:
        back.add_vertex_index(i)
    bi, geom = geom.add_face(back)
    for b in bases:
        inner = LoopInput()
        for i in [b + 4, b + 7, b + 6, b + 5]:
            inner.add_vertex_index(i)
        geom = geom.face_add_inner_loop(bi, inner)

    for quad in [[0, 4, 5, 1], [3, 2, 6, 7], [0, 3, 7, 4], [1, 5, 6, 2]]:
        lp = LoopInput()
        for i in quad:
            lp.add_vertex_index(i)
        _, geom = geom.add_face(lp)

    for b in bases:
        for quad in [[b, b + 1, b + 5, b + 4],          # sill
                     [b + 3, b + 7, b + 6, b + 2],      # header
                     [b, b + 4, b + 7, b + 3],          # jamb left
                     [b + 1, b + 2, b + 6, b + 5]]:     # jamb right
            lp = LoopInput()
            for i in quad:
                lp.add_vertex_index(i)
            _, geom = geom.add_face(lp)
    return geom

def merge_coplanar(group):
    for _ in range(400):
        found = False
        for edge in group.get_entities().get_edges():
            faces = edge.get_faces()
            if len(faces) == 2:
                n0 = faces[0].get_normal()
                n1 = faces[1].get_normal()
                if n0.x * n1.x + n0.y * n1.y + n0.z * n1.z > 0.9999:
                    group.get_entities().erase_entities([edge])
                    found = True
                    break
        if not found:
            break

siding = get_or_create_material("Siding", 214, 205, 190)
roofing = get_or_create_material("Roofing", 76, 80, 86)

house = Group()
model.get_entities().add_group(house)
house.set_name("Residence")

WALLS = [
${wallData || '    # (no wall data in plan model - roof-only job)'}
]
wall_count = 0
opening_count = 0
for (name, L, H, cos_a, sin_a, tx, ty, openings) in WALLS:
    wall = Group()
    house.get_entities().add_group(wall)
    wall.set_name(name)
    wall.get_entities().fill(make_wall_geom(L, ${WALL_THICKNESS_IN}.0, H, openings), weld_vertices=True)
    wall.set_transform(SUTransformation([
        cos_a, sin_a, 0, 0,
        -sin_a, cos_a, 0, 0,
        0, 0, 1, 0,
        tx, ty, 0, 1
    ]))
    paint(wall, siding)
    wall_count += 1
    opening_count += len(openings)

roof = Group()
house.get_entities().add_group(roof)
roof.set_name("Roof")
ROOF_PLANES = [
${roofData}
]
for (name, verts) in ROOF_PLANES:
    plane = Group()
    roof.get_entities().add_group(plane)
    plane.set_name(name)
    geom = GeometryInput()
    geom.set_vertices([SUPoint3D(x, y, z) for (x, y, z) in verts])
    for i in range(1, len(verts) - 1):
        lp = LoopInput()
        lp.add_vertex_index(0)
        lp.add_vertex_index(i)
        lp.add_vertex_index(i + 1)
        _, geom = geom.add_face(lp)
    plane.get_entities().fill(geom, weld_vertices=True)
    merge_coplanar(plane)
    paint(plane, roofing)
${terrainBlock}${deckBlock}
cam = Camera()
cam.enable_perspective(True)
cam.set_perspective_frustum_fov(35.0)
cam.set_orientation(
    SUPoint3D(${cam.eye.join(', ')}),
    SUPoint3D(${cam.target.join(', ')}),
    SUVector3D(0, 0, 1)
)
model.set_camera(cam)

result = {
    "walls": wall_count,
    "openings": opening_count,
    "roof_planes": len(ROOF_PLANES),
    "terrain": ${terrain ? 'True' : 'False'},
    "deck": ${deck ? 'True' : 'False'}
}
`;
}

function main() {
  const args = process.argv.slice(2);
  const optionNames = ['units', 'out', 'topo'];
  const files = args.filter((a, i) => !a.startsWith('--') && !(i > 0 && optionNames.includes(args[i - 1].slice(2))));
  const opt = name => {
    const i = args.indexOf(`--${name}`);
    return i >= 0 ? args[i + 1] : undefined;
  };
  if (!files[0]) {
    console.error('Usage: node scripts/hover/sketchup-code.js <plan-model.json> [--units ft|in] [--topo site-topo.json] [--out file.py]');
    process.exit(2);
  }
  let model, topo;
  try {
    model = pm.normalize(JSON.parse(fs.readFileSync(files[0], 'utf8')), { units: opt('units') });
    if (opt('topo')) topo = JSON.parse(fs.readFileSync(opt('topo'), 'utf8'));
  } catch (err) {
    console.error(err.message);
    process.exit(err.code === 'NEEDS_ADAPTER' ? 3 : 2);
  }
  const code = generateSketchupCode(model, { topo });
  const out = opt('out');
  if (out) {
    fs.writeFileSync(out, code);
    console.error(`SketchUp build code written to ${out} (pass its contents to the Trimble SketchUp MCP build_model tool, then save_model).`);
  } else {
    process.stdout.write(code);
  }
}

if (require.main === module) main();

module.exports = { generateSketchupCode, wallSpecs, roofSpecs, terrainSpec, deckSpec, parsePitchRise, WALL_THICKNESS_IN };
