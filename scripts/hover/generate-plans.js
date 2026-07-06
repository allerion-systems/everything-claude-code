#!/usr/bin/env node
/**
 * Generate permit-set style framing/roof plan sheets from a plan model
 * (neutral schema or HOVER measurement JSON — see scripts/hover/plan-model.js).
 *
 * Every sheet is emitted twice:
 *   - .dxf  — real CAD geometry in model space (decimal feet), R12 dialect
 *   - .svg  — ARCH D (36x24) plot sheet with border + title block, printable
 *             to PDF at the labeled scale
 *
 * Usage:
 *   node scripts/hover/generate-plans.js <model.json> [options]
 *
 * Options:
 *   --out <dir>       Output directory (default: ./construction-drawings)
 *   --units <ft|in>   Force source units when input is HOVER JSON
 *   --date <text>     Date printed in the title block
 *   --sheets <list>   Comma list from: roof,roof-framing,walls (default: all)
 *
 * Zero dependencies. Node 18+.
 */

const fs = require('fs');
const path = require('path');
const { DxfWriter } = require('./dxf');
const pm = require('./plan-model');

// ---------------------------------------------------------------------------
// Layers: one definition drives both DXF (ACI color/linetype) and SVG styling
// ---------------------------------------------------------------------------

const LAYERS = {
  'A-ROOF-OTLN': { color: 5, ltype: 'CONTINUOUS', svg: { stroke: '#1d4ed8', width: 0.02 } },
  'A-ROOF-RIDG': { color: 1, ltype: 'CONTINUOUS', svg: { stroke: '#b91c1c', width: 0.035 } },
  'A-ROOF-HIP': { color: 30, ltype: 'DASHED', svg: { stroke: '#c2410c', width: 0.025, dash: [0.14, 0.07] } },
  'A-ROOF-VALL': { color: 6, ltype: 'DASHED', svg: { stroke: '#7e22ce', width: 0.025, dash: [0.14, 0.07] } },
  'A-ROOF-EAVE': { color: 3, ltype: 'CONTINUOUS', svg: { stroke: '#15803d', width: 0.02 } },
  'A-ROOF-RAKE': { color: 4, ltype: 'CONTINUOUS', svg: { stroke: '#0e7490', width: 0.02 } },
  'S-FRAM-RAFT': { color: 8, ltype: 'CONTINUOUS', svg: { stroke: '#6b7280', width: 0.01 } },
  'S-FRAM-MEMB': { color: 1, ltype: 'CONTINUOUS', svg: { stroke: '#b91c1c', width: 0.035 } },
  'A-WALL': { color: 5, ltype: 'CONTINUOUS', svg: { stroke: '#1e3a8a', width: 0.025 } },
  'A-OPNG': { color: 4, ltype: 'CONTINUOUS', svg: { stroke: '#0e7490', width: 0.015 } },
  'S-HDR': { color: 1, ltype: 'CONTINUOUS', svg: { stroke: '#b91c1c', width: 0.03 } },
  'S-STUD': { color: 8, ltype: 'CONTINUOUS', svg: { stroke: '#6b7280', width: 0.01 } },
  'DIMS': { color: 2, ltype: 'CONTINUOUS', svg: { stroke: '#92400e', width: 0.012 } },
  'ANNO': { color: 7, ltype: 'CONTINUOUS', svg: { stroke: '#111827', width: 0.012 } },
  'NOTES': { color: 7, ltype: 'CONTINUOUS', svg: { stroke: '#111827', width: 0.012 } }
};

// ARCH D landscape, dimensions in paper inches
const SHEET = { width: 36, height: 24, margin: 0.5, titleWidth: 4.25 };

// Standard architectural scales, inches of paper per foot of model
const STANDARD_SCALES = [
  [1, '1" = 1\'-0"'],
  [0.75, '3/4" = 1\'-0"'],
  [0.5, '1/2" = 1\'-0"'],
  [0.375, '3/8" = 1\'-0"'],
  [0.25, '1/4" = 1\'-0"'],
  [0.1875, '3/16" = 1\'-0"'],
  [0.125, '1/8" = 1\'-0"'],
  [0.09375, '3/32" = 1\'-0"'],
  [0.0625, '1/16" = 1\'-0"'],
  [0.03125, '1/32" = 1\'-0"']
];

const DISCLAIMER =
  'PRELIMINARY DESIGN DOCUMENTS - NOT FOR CONSTRUCTION. GEOMETRY DERIVED FROM ' +
  'HOVER PHOTOGRAMMETRY DATA; FIELD VERIFY ALL DIMENSIONS AND CONDITIONS. ' +
  'STRUCTURAL MEMBER SIZES SHOWN ARE OWNER-SUPPLIED OR PLACEHOLDER VALUES AND ' +
  'MUST BE VERIFIED AGAINST THE GOVERNING BUILDING CODE AND, WHERE REQUIRED BY ' +
  'THE AUTHORITY HAVING JURISDICTION, REVIEWED AND SEALED BY A LICENSED DESIGN ' +
  'PROFESSIONAL BEFORE PERMIT SUBMISSION.';

// ---------------------------------------------------------------------------
// Primitive canvas (model space, decimal feet, Y up)
// ---------------------------------------------------------------------------

class Canvas {
  constructor() { this.prims = []; }
  line(layer, a, b) { this.prims.push({ kind: 'line', layer, a, b }); }
  poly(layer, pts, closed = true) { this.prims.push({ kind: 'poly', layer, pts, closed }); }
  text(layer, at, h, str, opts = {}) {
    this.prims.push({ kind: 'text', layer, at, h, str, rotation: opts.rotation || 0, align: opts.align || 'left' });
  }
  bounds() {
    const points = [];
    for (const p of this.prims) {
      if (p.kind === 'line') points.push(p.a, p.b);
      else if (p.kind === 'poly') points.push(...p.pts);
      else if (p.kind === 'text') {
        points.push(p.at, [p.at[0] + approxTextWidth(p.str, p.h), p.at[1] + p.h]);
      }
    }
    return pm.bbox(points.length ? points : [[0, 0], [1, 1]]);
  }
}

function approxTextWidth(str, h) { return String(str).length * h * 0.62; }

// ---------------------------------------------------------------------------
// Renderers
// ---------------------------------------------------------------------------

function renderDxf(canvas) {
  const dxf = new DxfWriter();
  for (const [name, def] of Object.entries(LAYERS)) dxf.addLayer(name, def.color, def.ltype);
  for (const p of canvas.prims) {
    if (p.kind === 'line') dxf.line(p.layer, p.a[0], p.a[1], p.b[0], p.b[1]);
    else if (p.kind === 'poly') dxf.polyline(p.layer, p.pts, p.closed);
    else if (p.kind === 'text') dxf.text(p.layer, p.at[0], p.at[1], p.h, p.str, { rotation: p.rotation, align: p.align });
  }
  return dxf.toString();
}

function chooseScale(width, height, areaW, areaH) {
  for (const [scale, label] of STANDARD_SCALES) {
    if (width * scale <= areaW && height * scale <= areaH) return { scale, label };
  }
  const last = STANDARD_SCALES[STANDARD_SCALES.length - 1];
  return { scale: last[0], label: `${last[1]} (DRAWING EXCEEDS SHEET)` };
}

function renderSvgSheet(canvas, meta) {
  const { width: W, height: H, margin: M, titleWidth: TW } = SHEET;
  const areaW = W - 2 * M - TW - 0.25;
  const areaH = H - 2 * M;
  const box = canvas.bounds();
  const { scale, label: scaleLabel } = chooseScale(box.width + 1, box.height + 1, areaW, areaH);

  const drawW = box.width * scale;
  const drawH = box.height * scale;
  const ox = M + Math.max(0, (areaW - drawW) / 2);
  const oy = M + Math.max(0, (areaH - drawH) / 2);
  const X = x => ox + (x - box.minX) * scale;
  const Y = y => oy + (box.maxY - y) * scale;

  const el = [];
  const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  const svgLine = (x1, y1, x2, y2, style) => {
    el.push(`<line x1="${n(x1)}" y1="${n(y1)}" x2="${n(x2)}" y2="${n(y2)}" stroke="${style.stroke}" stroke-width="${style.width}"${style.dash ? ` stroke-dasharray="${style.dash.join(',')}"` : ''} stroke-linecap="round"/>`);
  };
  const svgText = (x, y, h, str, style, opts = {}) => {
    const anchor = opts.align === 'center' ? 'middle' : opts.align === 'right' ? 'end' : 'start';
    const rot = opts.rotation ? ` transform="rotate(${-opts.rotation} ${n(x)} ${n(y)})"` : '';
    const weight = opts.bold ? ' font-weight="bold"' : '';
    el.push(`<text x="${n(x)}" y="${n(y)}" font-size="${n(h)}" font-family="Arial, Helvetica, sans-serif" fill="${style.stroke}" text-anchor="${anchor}"${weight}${rot}>${esc(str)}</text>`);
  };

  // model-space primitives
  for (const p of canvas.prims) {
    const style = LAYERS[p.layer].svg;
    if (p.kind === 'line') {
      svgLine(X(p.a[0]), Y(p.a[1]), X(p.b[0]), Y(p.b[1]), style);
    } else if (p.kind === 'poly') {
      const pts = p.closed ? [...p.pts, p.pts[0]] : p.pts;
      for (let i = 0; i + 1 < pts.length; i++) {
        svgLine(X(pts[i][0]), Y(pts[i][1]), X(pts[i + 1][0]), Y(pts[i + 1][1]), style);
      }
    } else if (p.kind === 'text') {
      svgText(X(p.at[0]), Y(p.at[1]), p.h * scale, p.str, style, p);
    }
  }

  // sheet furniture: border + title block
  const ink = { stroke: '#111827', width: 0.03 };
  const thin = { stroke: '#111827', width: 0.014 };
  el.push(`<rect x="${M}" y="${M}" width="${W - 2 * M}" height="${H - 2 * M}" fill="none" stroke="#111827" stroke-width="0.035"/>`);
  const tx = W - M - TW;
  svgLine(tx, M, tx, H - M, ink);

  let cy = M + 0.55;
  const field = (labelText, value, size = 0.17, gap = 0.34) => {
    svgText(tx + 0.2, cy, 0.11, labelText, thin);
    cy += 0.22;
    for (const lineText of wrapText(String(value || '-'), TW - 0.4, size)) {
      svgText(tx + 0.2, cy, size, lineText, ink, { bold: true });
      cy += size + 0.08;
    }
    cy += gap - 0.22;
    svgLine(tx, cy - 0.18, W - M, cy - 0.18, thin);
  };

  svgText(tx + 0.2, cy, 0.26, 'ECC CONSTRUCTION', ink, { bold: true });
  cy += 0.34;
  svgText(tx + 0.2, cy, 0.26, 'DRAWING AGENT', ink, { bold: true });
  cy += 0.28;
  svgText(tx + 0.2, cy, 0.11, 'GENERATED WITH CLAUDE CODE + HOVER', thin);
  cy += 0.3;
  svgLine(tx, cy - 0.18, W - M, cy - 0.18, thin);

  field('PROJECT', meta.project.name);
  field('ADDRESS', meta.project.address, 0.15);
  field('HOVER JOB', meta.project.jobId);
  field('SHEET TITLE', meta.title);
  field('SCALE', scaleLabel);
  field('DATE', meta.project.date);

  // disclaimer box
  const discTop = cy;
  let dy = discTop + 0.25;
  for (const lineText of wrapText(DISCLAIMER, TW - 0.4, 0.095)) {
    svgText(tx + 0.2, dy, 0.095, lineText, thin);
    dy += 0.16;
  }
  el.push(`<rect x="${tx + 0.08}" y="${n(discTop - 0.05)}" width="${TW - 0.16}" height="${n(dy - discTop)}" fill="none" stroke="#b91c1c" stroke-width="0.02"/>`);

  // sheet number
  const snY = H - M - 0.35;
  svgLine(tx, snY - 0.85, W - M, snY - 0.85, ink);
  svgText(tx + 0.2, snY - 0.5, 0.11, 'SHEET', thin);
  svgText(tx + TW / 2, snY + 0.15, 0.55, meta.sheetNo, ink, { align: 'center', bold: true });

  return `<?xml version="1.0" encoding="UTF-8"?>\n` +
    `<svg xmlns="http://www.w3.org/2000/svg" width="${W}in" height="${H}in" viewBox="0 0 ${W} ${H}">\n` +
    `<rect x="0" y="0" width="${W}" height="${H}" fill="#ffffff"/>\n` +
    el.join('\n') + '\n</svg>\n';
}

function n(v) { return Number(v.toFixed(4)); }

function wrapText(str, maxWidthIn, sizeIn) {
  const maxChars = Math.max(8, Math.floor(maxWidthIn / (sizeIn * 0.58)));
  const words = String(str).split(/\s+/);
  const lines = [];
  let current = '';
  for (const word of words) {
    if ((current + ' ' + word).trim().length > maxChars && current) {
      lines.push(current);
      current = word;
    } else {
      current = (current + ' ' + word).trim();
    }
  }
  if (current) lines.push(current);
  return lines;
}

// ---------------------------------------------------------------------------
// Shared drawing helpers
// ---------------------------------------------------------------------------

/** Linear dimension between two points, offset to one side (architectural ticks). */
function drawDim(c, a, b, side, offset, th) {
  const axis = pm.unit(pm.sub(b, a));
  const normal = pm.scale(pm.perp(axis), side);
  const a2 = pm.add(a, pm.scale(normal, offset));
  const b2 = pm.add(b, pm.scale(normal, offset));
  const ext = pm.scale(normal, th * 0.6);
  c.line('DIMS', pm.add(a, pm.scale(normal, th * 0.5)), pm.add(a2, ext));
  c.line('DIMS', pm.add(b, pm.scale(normal, th * 0.5)), pm.add(b2, ext));
  c.line('DIMS', a2, b2);
  const tickDir = pm.scale(pm.unit(pm.add(axis, normal)), th * 0.4);
  for (const p of [a2, b2]) {
    c.line('DIMS', pm.sub(p, tickDir), pm.add(p, tickDir));
  }
  const mid = pm.scale(pm.add(a2, b2), 0.5);
  const angle = Math.atan2(axis[1], axis[0]) * 180 / Math.PI;
  const textPos = pm.add(mid, pm.scale(normal, th * 0.8));
  c.text('DIMS', textPos, th, pm.ftIn(pm.dist(a, b)), { align: 'center', rotation: normalizeTextAngle(angle) });
}

function normalizeTextAngle(deg) {
  let d = ((deg % 360) + 360) % 360;
  if (d > 90 && d < 270) d -= 180;
  return d;
}

function drawNotes(c, x, yTop, title, notes, th) {
  let y = yTop;
  c.text('NOTES', [x, y], th * 1.3, title);
  y -= th * 2.4;
  notes.forEach((note, i) => {
    const lines = wrapText(note, 40 * th, th);
    lines.forEach((lineText, j) => {
      c.text('NOTES', [x, y], th, (j === 0 ? `${i + 1}. ` : '    ') + lineText);
      y -= th * 1.8;
    });
    y -= th * 0.6;
  });
  return y;
}

function drawTable(c, x, yTop, colWidths, rows, th) {
  const rowH = th * 2.2;
  const totalW = colWidths.reduce((s, w) => s + w, 0);
  let y = yTop;
  rows.forEach((row, r) => {
    let cx = x;
    row.forEach((cell, i) => {
      c.text('ANNO', [cx + th * 0.5, y - rowH + th * 0.55], th, String(cell), r === 0 ? { align: 'left' } : {});
      cx += colWidths[i];
    });
    c.line('ANNO', [x, y - rowH], [x + totalW, y - rowH]);
    y -= rowH;
  });
  c.line('ANNO', [x, yTop], [x + totalW, yTop]);
  let cx = x;
  for (const w of [...colWidths, 0]) {
    c.line('ANNO', [cx, yTop], [cx, y]);
    cx += w;
  }
  return y;
}

function parsePitch(pitch) {
  const m = /(\d+(?:\.\d+)?)\s*[/:]\s*12/.exec(String(pitch || ''));
  return m ? Number(m[1]) : null;
}

const EDGE_LAYER = {
  ridge: 'A-ROOF-RIDG',
  hip: 'A-ROOF-HIP',
  valley: 'A-ROOF-VALL',
  eave: 'A-ROOF-EAVE',
  rake: 'A-ROOF-RAKE'
};

// ---------------------------------------------------------------------------
// Sheet builders
// ---------------------------------------------------------------------------

function textHeightsFor(extentFt) {
  // Aim for ~1/8" annotation text on paper at whatever scale the sheet lands on.
  const areaW = SHEET.width - 2 * SHEET.margin - SHEET.titleWidth - 0.25;
  const areaH = SHEET.height - 2 * SHEET.margin;
  const { scale } = chooseScale(extentFt.width * 1.45 + 1, extentFt.height + 1, areaW, areaH);
  return { th: 0.125 / scale, scaleGuess: scale };
}

function buildRoofPlan(model) {
  const c = new Canvas();
  const allPts = model.roof.planes.flatMap(p => p.vertices);
  const box = pm.bbox(allPts);
  const { th } = textHeightsFor(box);

  for (const plane of model.roof.planes) {
    c.poly('A-ROOF-OTLN', plane.vertices, true);
    const at = pm.centroid(plane.vertices);
    c.text('ANNO', [at[0], at[1] + th * 0.4], th * 1.1, plane.id, { align: 'center' });
    if (plane.pitch) {
      c.text('ANNO', [at[0], at[1] - th * 1.6], th, `${plane.pitch} SLOPE`, { align: 'center' });
    }
  }
  for (const edge of model.roof.edges) {
    c.line(EDGE_LAYER[edge.type], edge.from, edge.to);
  }

  // overall dimensions
  drawDim(c, [box.minX, box.minY], [box.maxX, box.minY], -1, th * 4, th);
  drawDim(c, [box.maxX, box.minY], [box.maxX, box.maxY], -1, th * 4, th);

  // legend + area schedule + notes to the right of the plan
  const rx = box.maxX + th * 10;
  let y = box.maxY;
  c.text('NOTES', [rx, y], th * 1.3, 'LEGEND');
  y -= th * 2.4;
  for (const [type, layer] of Object.entries(EDGE_LAYER)) {
    c.line(layer, [rx, y + th * 0.35], [rx + th * 5, y + th * 0.35]);
    c.text('ANNO', [rx + th * 6, y], th, type.toUpperCase());
    y -= th * 2;
  }

  y -= th * 2;
  c.text('NOTES', [rx, y], th * 1.3, 'ROOF AREA SCHEDULE');
  y -= th * 1.2;
  const rows = [['PLANE', 'PITCH', 'PLAN SF', 'SLOPE SF']];
  let totalPlan = 0, totalSlope = 0;
  for (const plane of model.roof.planes) {
    const planArea = pm.polygonArea(plane.vertices);
    const rise = parsePitch(plane.pitch);
    const factor = rise === null ? 1 : Math.sqrt(1 + (rise / 12) ** 2);
    totalPlan += planArea;
    totalSlope += planArea * factor;
    rows.push([plane.id, plane.pitch || 'N/A', planArea.toFixed(0), (planArea * factor).toFixed(0)]);
  }
  rows.push(['TOTAL', '', totalPlan.toFixed(0), totalSlope.toFixed(0)]);
  y = drawTable(c, rx, y, [th * 8, th * 8, th * 9, th * 9], rows, th);

  y -= th * 3;
  drawNotes(c, rx, y, 'ROOF PLAN NOTES', [
    `GEOMETRY DERIVED FROM HOVER PHOTOGRAMMETRY MODEL${model.project.jobId ? ` (JOB #${model.project.jobId})` : ''}. FIELD VERIFY ALL DIMENSIONS PRIOR TO FABRICATION OR CONSTRUCTION.`,
    'SLOPE AREAS COMPUTED FROM PLAN AREA AND NOTED PITCH; NO WASTE FACTOR INCLUDED.',
    'RIDGES SHOWN HEAVY SOLID; HIPS AND VALLEYS SHOWN DASHED; SEE LEGEND.',
    'SEE SHEET S-2 FOR ROOF FRAMING.'
  ], th);

  return { file: 'roof-plan', title: 'ROOF PLAN', sheetNo: 'S-1', canvas: c };
}

function findEaveForPlane(plane, edges) {
  const onPlane = edge =>
    plane.vertices.some(v => pm.dist(v, edge.from) < 0.5) &&
    plane.vertices.some(v => pm.dist(v, edge.to) < 0.5);
  const eaves = edges.filter(e => e.type === 'eave' && onPlane(e));
  const pool = eaves.length ? eaves : [];
  let best = null, bestLen = -1;
  for (const e of pool) {
    const l = pm.dist(e.from, e.to);
    if (l > bestLen) { bestLen = l; best = [e.from, e.to]; }
  }
  if (best) return best;
  // fallback: longest polygon side
  for (let i = 0; i < plane.vertices.length; i++) {
    const a = plane.vertices[i];
    const b = plane.vertices[(i + 1) % plane.vertices.length];
    const l = pm.dist(a, b);
    if (l > bestLen) { bestLen = l; best = [a, b]; }
  }
  return best;
}

function buildRoofFraming(model) {
  const c = new Canvas();
  const allPts = model.roof.planes.flatMap(p => p.vertices);
  const box = pm.bbox(allPts);
  const { th } = textHeightsFor(box);
  const framing = model.framing;
  const spacingFt = framing.rafter.spacingIn / 12;
  let rafterCount = 0;

  for (const plane of model.roof.planes) {
    c.poly('A-ROOF-OTLN', plane.vertices, true);
    const [ea, eb] = findEaveForPlane(plane, model.roof.edges);
    const axis = pm.unit(pm.sub(eb, ea));
    const rafterDir = pm.perp(axis);
    const ts = plane.vertices.map(v => {
      const rel = pm.sub(v, ea);
      return rel[0] * axis[0] + rel[1] * axis[1];
    });
    const tMin = Math.min(...ts), tMax = Math.max(...ts);
    for (let t = tMin + spacingFt; t < tMax - 1e-6; t += spacingFt) {
      const base = pm.add(ea, pm.scale(axis, t));
      for (const [p1, p2] of pm.clipLineToPolygon(base, rafterDir, plane.vertices)) {
        c.line('S-FRAM-RAFT', p1, p2);
        rafterCount++;
      }
    }
    const at = pm.centroid(plane.vertices);
    c.text('ANNO', [at[0], at[1]], th, `${framing.rafter.size} RAFTERS @ ${framing.rafter.spacingIn}" O.C.`, { align: 'center' });
  }

  for (const edge of model.roof.edges) {
    if (edge.type === 'eave' || edge.type === 'rake') continue;
    c.line('S-FRAM-MEMB', edge.from, edge.to);
    const mid = pm.scale(pm.add(edge.from, edge.to), 0.5);
    const angle = Math.atan2(edge.to[1] - edge.from[1], edge.to[0] - edge.from[0]) * 180 / Math.PI;
    const callout = edge.type === 'ridge' ? `${framing.ridge} RIDGE` : `${framing.hipValley} ${edge.type.toUpperCase()}`;
    c.text('ANNO', [mid[0], mid[1] + th * 0.5], th, callout, { align: 'center', rotation: normalizeTextAngle(angle) });
  }

  drawDim(c, [box.minX, box.minY], [box.maxX, box.minY], -1, th * 4, th);

  const rx = box.maxX + th * 10;
  drawNotes(c, rx, box.maxY, 'ROOF FRAMING NOTES', [
    'RAFTER LAYOUT SHOWN FOR QUANTITY AND GEOMETRY ONLY. MEMBER SIZES AND SPACING ARE OWNER/DESIGNER-SUPPLIED VALUES - VERIFY AGAINST GOVERNING CODE SPAN TABLES (IRC R802) OR ENGINEERED DESIGN FOR ACTUAL SPANS, SPECIES, GRADE, AND LOADS.',
    'PROVIDE FULL-DEPTH RIDGE BOARD OR STRUCTURAL RIDGE BEAM AS REQUIRED BY CODE. RAFTER TIES / CEILING JOISTS OR APPROVED ALTERNATES REQUIRED WHERE RAFTERS DO NOT BEAR ON A STRUCTURAL RIDGE.',
    'PROVIDE UPLIFT CONNECTORS (RAFTER-TO-PLATE) AND BLOCKING PER GOVERNING CODE AND LOCAL WIND REQUIREMENTS.',
    'IF PRE-ENGINEERED TRUSSES ARE USED, TRUSS MANUFACTURER LAYOUT AND SEALED DRAWINGS GOVERN OVER THIS SHEET.',
    'FIELD VERIFY ALL DIMENSIONS AGAINST EXISTING CONDITIONS BEFORE ORDERING MATERIAL.'
  ], th);

  return { file: 'roof-framing-plan', title: 'ROOF FRAMING PLAN', sheetNo: 'S-2', canvas: c, rafterCount };
}

function headerFor(width, headers) {
  for (const [maxW, size] of headers) {
    if (width <= maxW) return size;
  }
  return headers[headers.length - 1][1];
}

function buildWallFraming(model) {
  if (!model.walls || !(model.walls.facades || []).length) return null;
  const c = new Canvas();
  const walls = model.walls;
  const framing = model.framing;
  const wallH = walls.height;
  const spacingFt = framing.stud.spacingIn / 12;

  const maxLen = Math.max(...walls.facades.map(f => pm.dist(f.from, f.to)));
  const { th } = textHeightsFor({ width: maxLen * 2.3 + 20, height: (wallH + 8) * Math.ceil(walls.facades.length / 2) });

  // header schedule marks: one mark per unique (type,width)
  const marks = new Map();
  const markFor = opening => {
    const key = `${opening.type || 'opening'}|${opening.width}`;
    if (!marks.has(key)) marks.set(key, { mark: `H${marks.size + 1}`, opening });
    return marks.get(key).mark;
  };

  const gapX = 8, gapY = 8 + th * 4;
  let anyAssumed = false;

  walls.facades.forEach((facade, i) => {
    const L = pm.dist(facade.from, facade.to);
    const col = i % 2, row = Math.floor(i / 2);
    const x0 = col * (maxLen + gapX);
    const y0 = -row * (wallH + gapY);

    // plates
    c.line('A-WALL', [x0, y0], [x0 + L, y0]);
    c.line('A-WALL', [x0, y0 + 0.12], [x0 + L, y0 + 0.12]);
    c.line('A-WALL', [x0, y0 + wallH], [x0 + L, y0 + wallH]);
    c.line('A-WALL', [x0, y0 + wallH - 0.12], [x0 + L, y0 + wallH - 0.12]);
    c.line('A-WALL', [x0, y0 + wallH - 0.24], [x0 + L, y0 + wallH - 0.24]);
    // end studs
    c.line('A-WALL', [x0, y0], [x0, y0 + wallH]);
    c.line('A-WALL', [x0 + L, y0], [x0 + L, y0 + wallH]);

    const openings = facade.openings.map(o => {
      const isDoor = String(o.type || '').toLowerCase().includes('door');
      const height = Number.isFinite(o.height) ? o.height : (isDoor ? 6.67 : 4);
      const sill = Number.isFinite(o.sill) ? o.sill : (isDoor ? 0 : 3);
      if (o.assumedLocation) anyAssumed = true;
      return { ...o, height, sill, isDoor };
    });

    // studs, skipping opening zones
    const inOpening = x => openings.some(o => x > o.offset + 0.05 && x < o.offset + o.width - 0.05);
    for (let x = spacingFt; x < L - 1e-6; x += spacingFt) {
      if (inOpening(x)) continue;
      c.line('S-STUD', [x0 + x, y0 + 0.12], [x0 + x, y0 + wallH - 0.24]);
    }

    for (const o of openings) {
      const ox = x0 + o.offset;
      const head = y0 + o.sill + o.height;
      c.poly('A-OPNG', [[ox, y0 + o.sill], [ox + o.width, y0 + o.sill], [ox + o.width, head], [ox, head]], true);
      // header band
      const hdrTop = Math.min(head + 0.75, y0 + wallH - 0.24);
      c.poly('S-HDR', [[ox, head], [ox + o.width, head], [ox + o.width, hdrTop], [ox, hdrTop]], true);
      // king + trimmer studs
      for (const side of [ox, ox + o.width]) {
        const dir = side === ox ? -1 : 1;
        c.line('A-WALL', [side, y0 + 0.12], [side, y0 + wallH - 0.24]);
        c.line('A-WALL', [side + dir * 0.13, y0 + 0.12], [side + dir * 0.13, y0 + wallH - 0.24]);
      }
      const mark = markFor(o);
      c.text('ANNO', [ox + o.width / 2, head + 0.2], th, mark, { align: 'center' });
      c.text('ANNO', [ox + o.width / 2, y0 + o.sill + o.height / 2], th * 0.9,
        `${pm.ftIn(o.width)} x ${pm.ftIn(o.height)}${o.assumedLocation ? ' *' : ''}`, { align: 'center' });
      drawDim(c, [ox, y0], [ox + o.width, y0], -1, th * 2.5, th * 0.8);
    }

    drawDim(c, [x0, y0], [x0 + L, y0], -1, th * 5.5, th);
    c.text('ANNO', [x0, y0 + wallH + th * 1.5], th * 1.2,
      `FACADE ${facade.id}${facade.name ? ` - ${facade.name}` : ''}  (${framing.stud.size} STUDS @ ${framing.stud.spacingIn}" O.C.)`);
  });

  // header schedule + notes to the right
  const rows = Math.ceil(walls.facades.length / 2);
  const rx = 2 * (maxLen + gapX) + th * 4;
  let y = walls.height + th * 4;
  c.text('NOTES', [rx, y], th * 1.3, 'HEADER SCHEDULE');
  y -= th * 1.2;
  const tableRows = [['MARK', 'ROUGH OPENING', 'HEADER (VERIFY)', 'SUPPORT']];
  for (const { mark, opening } of marks.values()) {
    tableRows.push([
      mark,
      pm.ftIn(opening.width),
      headerFor(opening.width, framing.headers),
      opening.width <= 6 ? '(1) TRIMMER + (1) KING EA. SIDE' : '(2) TRIMMERS + (1) KING EA. SIDE'
    ]);
  }
  if (tableRows.length === 1) tableRows.push(['-', 'NO OPENINGS', '-', '-']);
  y = drawTable(c, rx, y, [th * 6, th * 12, th * 22, th * 24], tableRows, th);

  y -= th * 3;
  const notes = [
    `EXTERIOR WALLS: ${framing.stud.size} STUDS @ ${framing.stud.spacingIn}" O.C. WITH DOUBLE TOP PLATE AND PRESSURE-TREATED SILL AT CONCRETE. VERIFY STUD SIZE/SPACING AND SHEATHING/BRACING AGAINST GOVERNING CODE (IRC R602).`,
    'HEADER SIZES SHOWN ARE PLACEHOLDER/OWNER-SUPPLIED VALUES AND MUST BE VERIFIED AGAINST GOVERNING CODE HEADER TABLES OR ENGINEERED DESIGN FOR ACTUAL LOADS AND BEARING CONDITIONS.',
    'WINDOW AND DOOR ROUGH OPENING DIMENSIONS FROM HOVER EXTERIOR MEASUREMENTS; CONFIRM AGAINST MANUFACTURER ROUGH OPENING REQUIREMENTS.',
    'WALL HEIGHTS ASSUMED WHERE NOT MEASURED; FIELD VERIFY.'
  ];
  if (anyAssumed) {
    notes.push('* OPENING LOCATIONS MARKED WITH AN ASTERISK ARE ASSUMED (EVENLY DISTRIBUTED) - LOCATE FROM FIELD MEASUREMENTS OR ELEVATION PHOTOS BEFORE FRAMING.');
  }
  drawNotes(c, rx, y - rows * 0, 'WALL FRAMING NOTES', notes, th);

  return { file: 'wall-framing', title: 'WALL FRAMING ELEVATIONS & SCHEDULES', sheetNo: 'S-3', canvas: c };
}

function deckRect(deck) {
  const d = Array.isArray(deck.direction) ? deck.direction : [0, 1];
  const lateral = [d[1], d[0]];
  const A = deck.origin;
  const B = pm.add(A, pm.scale(lateral, deck.width));
  const C = pm.add(B, pm.scale(d, deck.depth));
  const D = pm.add(A, pm.scale(d, deck.depth));
  return { A, B, C, D, d, lateral };
}

function buildDeckPlan(model) {
  if (!model.deck) return null;
  const deck = model.deck;
  const { A, B, C, D, d, lateral } = deckRect(deck);
  const c = new Canvas();
  const { th } = textHeightsFor({ width: deck.width * 2.2 + 20, height: deck.depth + 10 });

  // house wall line at the ledger edge for context
  const wallExt = pm.scale(lateral, 4);
  c.line('A-WALL', pm.sub(A, wallExt), pm.add(B, wallExt));
  c.poly('A-WALL', [A, B, C, D], true);

  // ledger along A-B
  c.line('S-FRAM-MEMB', A, B);
  const abMid = pm.scale(pm.add(A, B), 0.5);
  const ledgerAngle = Math.atan2(B[1] - A[1], B[0] - A[0]) * 180 / Math.PI;
  c.text('ANNO', pm.add(abMid, pm.scale(d, th * 0.8)), th, deck.ledger + ' - VERIFY',
    { align: 'center', rotation: normalizeTextAngle(ledgerAngle) });

  // joists span from ledger to outer edge, spaced along the lateral axis
  const spacingFt = deck.joist.spacingIn / 12;
  let joists = 0;
  for (let t = spacingFt; t < deck.width - 1e-6; t += spacingFt) {
    const p1 = pm.add(A, pm.scale(lateral, t));
    c.line('S-FRAM-RAFT', p1, pm.add(p1, pm.scale(d, deck.depth)));
    joists++;
  }
  const center = pm.scale(pm.add(A, C), 0.5);
  c.text('ANNO', center, th, `${deck.joist.size} JOISTS @ ${deck.joist.spacingIn}" O.C.`, { align: 'center' });

  // drop beam with cantilever, posts at ends + middle
  const beamSet = Math.min(1.5, deck.depth / 4);
  const bA = pm.add(A, pm.scale(d, deck.depth - beamSet));
  const bB = pm.add(B, pm.scale(d, deck.depth - beamSet));
  c.line('S-FRAM-MEMB', bA, bB);
  c.text('ANNO', pm.add(pm.scale(pm.add(bA, bB), 0.5), pm.scale(d, th * 0.8)), th,
    `${deck.beam} BEAM - VERIFY`, { align: 'center', rotation: normalizeTextAngle(ledgerAngle) });
  const postT = deck.width > 12 ? [1, deck.width / 2, deck.width - 1] : [1, deck.width - 1];
  for (const t of postT) {
    const p = pm.add(pm.add(A, pm.scale(lateral, t)), pm.scale(d, deck.depth - beamSet));
    c.poly('S-HDR', [
      [p[0] - 0.25, p[1] - 0.25], [p[0] + 0.25, p[1] - 0.25],
      [p[0] + 0.25, p[1] + 0.25], [p[0] - 0.25, p[1] + 0.25]
    ], true);
  }
  c.text('ANNO', pm.add(pm.scale(pm.add(bA, bB), 0.5), pm.scale(d, -th * 2.2)), th,
    `${deck.posts} POSTS ON FOOTINGS PER CODE (${postT.length}x)`, { align: 'center', rotation: normalizeTextAngle(ledgerAngle) });

  drawDim(c, A, B, -1, th * 4, th);
  drawDim(c, B, C, -1, th * 4, th);

  const box = pm.bbox([A, B, C, D]);
  const rx = box.maxX + th * 10;
  const notes = [
    `DECK FRAMING PER GOVERNING CODE (IRC R507). MEMBER SIZES SHOWN ARE OWNER-SUPPLIED OR PLACEHOLDER VALUES - VERIFY SPANS, SPECIES, AND FASTENING AGAINST CODE TABLES OR ENGINEERED DESIGN.`,
    'LEDGER ATTACHMENT TO EXISTING STRUCTURE MUST BE VERIFIED (RIM/BAND CONDITION, FLASHING, LATERAL-LOAD ANCHORS PER R507.9.2).',
    'FOOTINGS: SIZE AND DEPTH PER LOCAL FROST DEPTH AND SOIL BEARING - VERIFY WITH BUILDING DEPARTMENT.',
    'ALL LUMBER PRESSURE-TREATED OR NATURALLY DURABLE; HOT-DIPPED GALVANIZED OR STAINLESS CONNECTORS.'
  ];
  if (deck.guardrail) {
    notes.push('GUARDRAIL REQUIRED: WALKING SURFACE > 30" ABOVE GRADE. 36" MIN HEIGHT, 4" SPHERE RULE (VERIFY LOCAL AMENDMENTS).');
  }
  if (deck.estimated) {
    notes.unshift('DECK DIMENSIONS ESTIMATED FROM HOVER CAPTURE PHOTOS (HOVER DOES NOT MEASURE DECKS). FIELD VERIFY ALL DECK DIMENSIONS BEFORE ORDERING MATERIAL OR SUBMITTING FOR PERMIT.');
  }
  drawNotes(c, rx, box.maxY, 'DECK FRAMING NOTES', notes, th);

  return { file: 'deck-framing-plan', title: 'DECK FRAMING PLAN', sheetNo: 'S-4', canvas: c, joistCount: joists };
}

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------

function generate(model, options = {}) {
  const sheetsWanted = options.sheets || ['roof', 'roof-framing', 'walls', 'deck'];
  const built = [];
  if (sheetsWanted.includes('roof')) built.push(buildRoofPlan(model));
  if (sheetsWanted.includes('roof-framing')) built.push(buildRoofFraming(model));
  if (sheetsWanted.includes('walls')) {
    const walls = buildWallFraming(model);
    if (walls) built.push(walls);
  }
  if (sheetsWanted.includes('deck')) {
    const deckSheet = buildDeckPlan(model);
    if (deckSheet) built.push(deckSheet);
  }

  const outputs = [];
  for (const sheet of built) {
    outputs.push({
      sheet,
      dxf: renderDxf(sheet.canvas),
      svg: renderSvgSheet(sheet.canvas, { project: model.project, title: sheet.title, sheetNo: sheet.sheetNo })
    });
  }
  return outputs;
}

function parseArgs(argv) {
  const args = { _: [] };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--out' || a === '--units' || a === '--date' || a === '--sheets') {
      args[a.slice(2)] = argv[++i];
    } else if (a.startsWith('--')) {
      throw new Error(`Unknown option ${a}`);
    } else {
      args._.push(a);
    }
  }
  return args;
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const inputPath = args._[0];
  if (!inputPath) {
    console.error('Usage: node scripts/hover/generate-plans.js <plan-model.json> [--out dir] [--units ft|in] [--date "..."] [--sheets roof,roof-framing,walls]');
    process.exit(2);
  }

  let raw;
  try {
    raw = JSON.parse(fs.readFileSync(inputPath, 'utf8'));
  } catch (err) {
    console.error(`Could not read/parse ${inputPath}: ${err.message}`);
    process.exit(2);
  }

  let model;
  try {
    model = pm.normalize(raw, { units: args.units });
  } catch (err) {
    console.error(err.message);
    process.exit(err.code === 'NEEDS_ADAPTER' ? 3 : 2);
  }
  if (args.date) model.project.date = args.date;

  const outDir = args.out || path.join(process.cwd(), 'construction-drawings');
  fs.mkdirSync(outDir, { recursive: true });

  const outputs = generate(model, {
    sheets: args.sheets ? args.sheets.split(',').map(s => s.trim()) : undefined
  });

  console.log(`Plan set for: ${model.project.name || '(unnamed)'} ${model.project.address ? '- ' + model.project.address : ''}`);
  for (const { sheet, dxf, svg } of outputs) {
    const dxfPath = path.join(outDir, `${sheet.file}.dxf`);
    const svgPath = path.join(outDir, `${sheet.file}.svg`);
    fs.writeFileSync(dxfPath, dxf);
    fs.writeFileSync(svgPath, svg);
    console.log(`  ${sheet.sheetNo}  ${sheet.title}`);
    console.log(`      ${dxfPath}`);
    console.log(`      ${svgPath}`);
  }
  console.log('\nREMINDER: preliminary documents - field verify and have reviewed/sealed as required before permit submission.');
}

if (require.main === module) main();

module.exports = { generate, buildRoofPlan, buildRoofFraming, buildWallFraming, buildDeckPlan, deckRect, renderDxf, renderSvgSheet, chooseScale, LAYERS, SHEET };
