/**
 * Neutral "plan model" for construction drawing generation, plus a
 * best-effort adapter from HOVER measurement JSON.
 *
 * All coordinates are plan-view XY in DECIMAL FEET, Y increasing north/up.
 *
 * Neutral schema (the generator's contract):
 * {
 *   "project": { "name", "address", "jobId", "date" },
 *   "roof": {
 *     "planes": [ { "id": "A", "pitch": "6/12", "vertices": [[x,y], ...] } ],
 *     "edges":  [ { "type": "ridge|hip|valley|eave|rake",
 *                   "from": [x,y], "to": [x,y] } ]
 *   },
 *   "walls": {
 *     "footprint": [[x,y], ...],
 *     "height": 8,
 *     "facades": [ { "id": "F1", "name": "NORTH", "from": [x,y], "to": [x,y],
 *                    "openings": [ { "type": "window|door", "width": 3,
 *                                    "height": 4, "sill": 3, "offset": 2.5 } ] } ]
 *   },
 *   "framing": {
 *     "rafter": { "size": "2x8", "spacingIn": 16 },
 *     "ridge": "2x10",
 *     "hipValley": "2x10",
 *     "stud": { "size": "2x6", "spacingIn": 16 },
 *     "headers": [ [4, "(2) 2x6"], [6, "(2) 2x8"], [8, "(2) 2x10"], [16, "(2) 2x12 OR ENGINEERED BEAM"] ]
 *   }
 * }
 *
 * Anything HOVER cannot supply (member sizes, opening offsets) falls back to
 * clearly flagged defaults that must be verified before permit submission.
 */

const EDGE_TYPES = ['ridge', 'hip', 'valley', 'eave', 'rake'];

const DEFAULT_FRAMING = {
  rafter: { size: '2x8', spacingIn: 16 },
  ridge: '2x10',
  hipValley: '2x10',
  stud: { size: '2x6', spacingIn: 16 },
  // [max opening width ft, header callout] — prescriptive-style placeholders,
  // always printed with a VERIFY note on the sheets.
  headers: [
    [4, '(2) 2x6'],
    [6, '(2) 2x8'],
    [8, '(2) 2x10'],
    [16, '(2) 2x12 OR ENGINEERED BEAM']
  ]
};

// ---------------------------------------------------------------------------
// Geometry helpers
// ---------------------------------------------------------------------------

function sub(a, b) { return [a[0] - b[0], a[1] - b[1]]; }
function add(a, b) { return [a[0] + b[0], a[1] + b[1]]; }
function scale(a, k) { return [a[0] * k, a[1] * k]; }
function len(a) { return Math.hypot(a[0], a[1]); }
function dist(a, b) { return len(sub(a, b)); }
function unit(a) {
  const l = len(a);
  if (l === 0) throw new Error('Cannot normalize zero-length vector');
  return [a[0] / l, a[1] / l];
}
function perp(a) { return [-a[1], a[0]]; }

function bbox(points) {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const [x, y] of points) {
    if (x < minX) minX = x;
    if (y < minY) minY = y;
    if (x > maxX) maxX = x;
    if (y > maxY) maxY = y;
  }
  return { minX, minY, maxX, maxY, width: maxX - minX, height: maxY - minY };
}

function polygonArea(points) {
  let sum = 0;
  for (let i = 0; i < points.length; i++) {
    const [x1, y1] = points[i];
    const [x2, y2] = points[(i + 1) % points.length];
    sum += x1 * y2 - x2 * y1;
  }
  return Math.abs(sum) / 2;
}

function centroid(points) {
  let cx = 0, cy = 0;
  for (const [x, y] of points) { cx += x; cy += y; }
  return [cx / points.length, cy / points.length];
}

function pointInPolygon(pt, polygon) {
  const [x, y] = pt;
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const [xi, yi] = polygon[i];
    const [xj, yj] = polygon[j];
    if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) {
      inside = !inside;
    }
  }
  return inside;
}

/**
 * Clip the infinite line through `point` with direction `dir` against a
 * simple polygon. Returns the segments of the line that lie inside the
 * polygon as [[x,y],[x,y]] pairs.
 */
function clipLineToPolygon(point, dir, polygon) {
  const d = unit(dir);
  const ts = [];
  for (let i = 0; i < polygon.length; i++) {
    const a = polygon[i];
    const b = polygon[(i + 1) % polygon.length];
    const e = sub(b, a);
    const denom = d[0] * e[1] - d[1] * e[0];
    if (Math.abs(denom) < 1e-12) continue; // parallel
    const ap = sub(a, point);
    const t = (ap[0] * e[1] - ap[1] * e[0]) / denom;      // along the line
    const u = (ap[0] * d[1] - ap[1] * d[0]) / denom;      // along the edge
    if (u >= -1e-9 && u <= 1 + 1e-9) ts.push(t);
  }
  ts.sort((x, y) => x - y);

  const segments = [];
  for (let i = 0; i + 1 < ts.length; i++) {
    const t1 = ts[i], t2 = ts[i + 1];
    if (t2 - t1 < 1e-9) continue;
    const mid = add(point, scale(d, (t1 + t2) / 2));
    if (pointInPolygon(mid, polygon)) {
      segments.push([add(point, scale(d, t1)), add(point, scale(d, t2))]);
    }
  }
  return segments;
}

/** 24.5208 -> `24'-6 1/4"` (nearest 1/4"). */
function ftIn(feet) {
  const sign = feet < 0 ? '-' : '';
  const totalQuarters = Math.round(Math.abs(feet) * 48);
  let ft = Math.floor(totalQuarters / 48);
  let quarters = totalQuarters % 48;
  let inches = Math.floor(quarters / 4);
  quarters = quarters % 4;
  if (inches === 12) { ft += 1; inches = 0; }
  const frac = quarters === 0 ? '' : ` ${quarters === 2 ? '1/2' : `${quarters}/4`}`;
  if (inches === 0 && quarters === 0) return `${sign}${ft}'-0"`;
  return `${sign}${ft}'-${inches}${frac}"`;
}

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

function isPoint(p) {
  return Array.isArray(p) && p.length >= 2 &&
    Number.isFinite(p[0]) && Number.isFinite(p[1]);
}

function validatePlanModel(model) {
  const errors = [];
  const fail = msg => errors.push(msg);

  if (!model || typeof model !== 'object') {
    throw new Error('Plan model must be a JSON object. See scripts/hover/plan-model.js for the schema.');
  }

  const roof = model.roof;
  if (!roof || !Array.isArray(roof.planes) || roof.planes.length === 0) {
    fail('roof.planes must be a non-empty array of { id, pitch, vertices }');
  } else {
    roof.planes.forEach((plane, i) => {
      if (!Array.isArray(plane.vertices) || plane.vertices.length < 3) {
        fail(`roof.planes[${i}] needs at least 3 vertices`);
      } else if (!plane.vertices.every(isPoint)) {
        fail(`roof.planes[${i}].vertices must be [x,y] number pairs (decimal feet)`);
      }
    });
  }
  if (roof && Array.isArray(roof.edges)) {
    roof.edges.forEach((edge, i) => {
      if (!EDGE_TYPES.includes(edge.type)) {
        fail(`roof.edges[${i}].type "${edge.type}" must be one of: ${EDGE_TYPES.join(', ')}`);
      }
      if (!isPoint(edge.from) || !isPoint(edge.to)) {
        fail(`roof.edges[${i}] needs numeric "from" and "to" [x,y] points`);
      }
    });
  }

  const walls = model.walls;
  if (walls) {
    if (walls.footprint && (!Array.isArray(walls.footprint) || walls.footprint.length < 3 || !walls.footprint.every(isPoint))) {
      fail('walls.footprint must be an array of at least 3 [x,y] points');
    }
    if (walls.facades) {
      walls.facades.forEach((f, i) => {
        if (!isPoint(f.from) || !isPoint(f.to)) fail(`walls.facades[${i}] needs "from" and "to" [x,y] points`);
        (f.openings || []).forEach((o, j) => {
          if (!Number.isFinite(o.width) || o.width <= 0) {
            fail(`walls.facades[${i}].openings[${j}].width must be a positive number (feet)`);
          }
        });
      });
    }
  }

  if (errors.length > 0) {
    const err = new Error(`Invalid plan model:\n  - ${errors.join('\n  - ')}`);
    err.code = 'INVALID_PLAN_MODEL';
    throw err;
  }
  return model;
}

// ---------------------------------------------------------------------------
// Normalization
// ---------------------------------------------------------------------------

/**
 * Accepts either a neutral plan model or raw HOVER measurement JSON and
 * returns a validated, fully-defaulted plan model. Throws with code
 * NEEDS_ADAPTER when the input cannot be recognized — the calling agent
 * should then transform the source JSON into the neutral schema itself.
 */
function normalize(input, options = {}) {
  let model;
  if (looksNeutral(input)) {
    model = input;
  } else {
    model = fromHover(input, options);
  }

  model.project = Object.assign(
    { name: 'UNNAMED PROJECT', address: '', jobId: '', date: '' },
    model.project || {}
  );
  model.framing = mergeFraming(model.framing);
  model.roof.edges = model.roof.edges || [];
  model.roof.planes.forEach((plane, i) => {
    if (!plane.id) plane.id = String.fromCharCode(65 + (i % 26));
  });

  if (model.walls) {
    model.walls.height = Number.isFinite(model.walls.height) ? model.walls.height : 8;
    if (!model.walls.facades && model.walls.footprint) {
      model.walls.facades = facadesFromFootprint(model.walls.footprint);
    }
    (model.walls.facades || []).forEach((facade, i) => {
      if (!facade.id) facade.id = `F${i + 1}`;
      facade.openings = facade.openings || [];
      spreadUnplacedOpenings(facade);
    });
  }

  return validatePlanModel(model);
}

function looksNeutral(input) {
  return Boolean(input && input.roof && Array.isArray(input.roof.planes) &&
    input.roof.planes.length > 0 && Array.isArray(input.roof.planes[0].vertices));
}

function mergeFraming(framing) {
  const merged = JSON.parse(JSON.stringify(DEFAULT_FRAMING));
  if (!framing) return merged;
  if (framing.rafter) Object.assign(merged.rafter, framing.rafter);
  if (framing.stud) Object.assign(merged.stud, framing.stud);
  if (framing.ridge) merged.ridge = framing.ridge;
  if (framing.hipValley) merged.hipValley = framing.hipValley;
  if (Array.isArray(framing.headers) && framing.headers.length > 0) merged.headers = framing.headers;
  return merged;
}

function facadesFromFootprint(footprint) {
  const names = ['SOUTH', 'EAST', 'NORTH', 'WEST'];
  return footprint.map((from, i) => {
    const to = footprint[(i + 1) % footprint.length];
    return {
      id: `F${i + 1}`,
      name: footprint.length === 4 ? names[i % 4] : `FACADE ${i + 1}`,
      from,
      to,
      openings: []
    };
  });
}

/** Openings without an offset get spread evenly and flagged as assumed. */
function spreadUnplacedOpenings(facade) {
  const length = dist(facade.from, facade.to);
  const unplaced = facade.openings.filter(o => !Number.isFinite(o.offset));
  if (unplaced.length === 0) return;
  const totalWidth = unplaced.reduce((sum, o) => sum + o.width, 0);
  const gap = Math.max(0.5, (length - totalWidth) / (unplaced.length + 1));
  let cursor = gap;
  for (const opening of unplaced) {
    opening.offset = cursor;
    opening.assumedLocation = true;
    cursor += opening.width + gap;
  }
}

// ---------------------------------------------------------------------------
// HOVER adapter (best effort)
// ---------------------------------------------------------------------------

const HOVER_EDGE_MAP = {
  RIDGE: 'ridge', RIDGES: 'ridge',
  HIP: 'hip', HIPS: 'hip',
  VALLEY: 'valley', VALLEYS: 'valley',
  EAVE: 'eave', EAVES: 'eave', GUTTER: 'eave', GUTTERS: 'eave',
  RAKE: 'rake', RAKES: 'rake',
  FLASHING: 'eave', STEP_FLASHING: 'eave'
};

/**
 * Best-effort conversion of HOVER measurement JSON (roof_lines / full_json
 * shapes) into the neutral model. HOVER's exact payload varies by
 * deliverable and version, so this looks for the common shapes:
 * facets/planes with point lists, and line collections keyed or tagged by
 * edge type. When nothing recognizable is found it throws NEEDS_ADAPTER.
 */
function fromHover(json, options = {}) {
  if (!json || typeof json !== 'object') {
    throw needsAdapter('Input is not a JSON object.');
  }
  const roofSource = json.roof || json;

  const planes = collectHoverPlanes(roofSource);
  if (planes.length === 0) {
    throw needsAdapter('Could not find roof facets/planes with vertex coordinates.');
  }

  const edges = collectHoverEdges(roofSource);

  // Heuristic unit detection: a roof plan larger than 200 units across is
  // almost certainly measured in inches (200 ft is implausibly large, 200 in
  // is a small shed). Pass options.units ('ft'|'in') to override.
  const allPoints = planes.flatMap(p => p.vertices);
  const box = bbox(allPoints);
  const divisor = options.units === 'in' || (options.units !== 'ft' && Math.max(box.width, box.height) > 200) ? 12 : 1;
  if (divisor !== 1) {
    for (const plane of planes) plane.vertices = plane.vertices.map(p => [p[0] / 12, p[1] / 12]);
    for (const edge of edges) {
      edge.from = [edge.from[0] / 12, edge.from[1] / 12];
      edge.to = [edge.to[0] / 12, edge.to[1] / 12];
    }
  }

  return {
    project: {
      name: json.name || json.job_name || '',
      address: formatHoverAddress(json.address),
      jobId: String(json.job_id || json.id || '')
    },
    roof: { planes, edges },
    walls: null
  };
}

function collectHoverPlanes(source) {
  const rawPlanes = source.planes || source.facets || source.roof_planes || [];
  const planes = [];
  for (const raw of rawPlanes) {
    const pts = raw.vertices || raw.points || raw.polygon || raw.outline;
    if (!Array.isArray(pts) || pts.length < 3) continue;
    const vertices = pts.map(toPoint).filter(Boolean);
    if (vertices.length < 3) continue;
    planes.push({
      id: raw.id !== undefined && raw.id !== null ? String(raw.id) : undefined,
      pitch: raw.pitch || raw.slope || '',
      vertices
    });
  }
  return planes;
}

function collectHoverEdges(source) {
  const edges = [];
  const push = (type, raw) => {
    const pts = raw.points || raw.vertices || (raw.from && raw.to ? [raw.from, raw.to] : null);
    if (!Array.isArray(pts) || pts.length < 2) return;
    for (let i = 0; i + 1 < pts.length; i++) {
      const from = toPoint(pts[i]);
      const to = toPoint(pts[i + 1]);
      if (from && to) edges.push({ type, from, to });
    }
  };

  const lines = source.lines || source.edges || [];
  for (const raw of lines) {
    const key = String(raw.type || raw.kind || raw.name || '').toUpperCase().replace(/[^A-Z_]/g, '');
    const type = HOVER_EDGE_MAP[key];
    if (type) push(type, raw);
  }
  for (const [key, mapped] of Object.entries(HOVER_EDGE_MAP)) {
    const group = source[key.toLowerCase()];
    if (Array.isArray(group)) {
      for (const raw of group) push(mapped, raw);
    }
  }
  return edges;
}

function toPoint(raw) {
  if (isPoint(raw)) return [raw[0], raw[1]];
  if (raw && Number.isFinite(raw.x) && Number.isFinite(raw.y)) return [raw.x, raw.y];
  return null;
}

function formatHoverAddress(address) {
  if (!address) return '';
  if (typeof address === 'string') return address;
  return [address.line_1 || address.street, address.city, address.region || address.state, address.postal_code || address.zip_code]
    .filter(Boolean).join(', ');
}

function needsAdapter(reason) {
  const err = new Error(
    `${reason}\nThis HOVER payload shape is not auto-convertible. ` +
    'Transform it into the neutral plan-model schema documented at the top of ' +
    'scripts/hover/plan-model.js and re-run the generator with that file.'
  );
  err.code = 'NEEDS_ADAPTER';
  return err;
}

module.exports = {
  EDGE_TYPES,
  DEFAULT_FRAMING,
  normalize,
  validatePlanModel,
  fromHover,
  // geometry helpers
  sub, add, scale, len, dist, unit, perp,
  bbox, polygonArea, centroid, pointInPolygon, clipLineToPolygon, ftIn
};
