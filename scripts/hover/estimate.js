#!/usr/bin/env node
/**
 * Materials takeoff + preliminary cost estimate from a plan model.
 *
 * Part of the HOVER pipeline (see scripts/hover/plan-model.js for the neutral
 * schema). Quantities are computed deterministically from the same geometry
 * the drawing generator uses; prices come from a user price book, falling
 * back to embedded PLACEHOLDER values that are flagged on every line.
 *
 * Usage:
 *   node scripts/hover/estimate.js <plan-model.json | hover-measurements.json>
 *        [--prices <price-book.json>] [--out <dir>] [--date YYYY-MM-DD]
 *        [--waste-roof 10] [--waste-siding 10] [--waste-framing 10]
 *        [--markup 10] [--tax 0] [--sections roofing,siding,framing,deck]
 *   node scripts/hover/estimate.js --print-prices > my-price-book.json
 *
 * Outputs (in --out, default alongside the model): estimate.json,
 * estimate.csv, estimate.md. The estimate is PRELIMINARY — not a bid.
 *
 * Price book schema (same shape as --print-prices emits):
 *   { "currency": "USD",
 *     "items": { "<key>": { "unit": "SQ|SF|LF|EA", "material": n, "labor": n } } }
 */

const fs = require('fs');
const path = require('path');
const pm = require('./plan-model');

// ---------------------------------------------------------------------------
// Placeholder price book — every value here is a rough national-average
// placeholder and is flagged PLACEHOLDER on the estimate. Supply --prices.
// ---------------------------------------------------------------------------

const DEFAULT_PRICES = {
  currency: 'USD',
  items: {
    shingles:        { unit: 'SQ', material: 120, labor: 175, note: 'Architectural asphalt, installed per square' },
    underlayment:    { unit: 'SQ', material: 25,  labor: 10 },
    starter_strip:   { unit: 'LF', material: 0.85, labor: 0.30 },
    ridge_cap:       { unit: 'LF', material: 3.00, labor: 2.00 },
    drip_edge:       { unit: 'LF', material: 1.60, labor: 1.20 },
    ice_water_shield:{ unit: 'LF', material: 2.20, labor: 1.00, note: 'Priced per LF of 3ft-wide membrane' },
    roof_fasteners:  { unit: 'SQ', material: 6.00, labor: 0 },
    siding:          { unit: 'SF', material: 3.25, labor: 3.00, note: 'Fiber cement lap, installed' },
    housewrap:       { unit: 'SF', material: 0.25, labor: 0.15 },
    opening_trim:    { unit: 'LF', material: 2.50, labor: 2.00 },
    lumber_2x4:      { unit: 'LF', material: 0.70, labor: 0 },
    lumber_2x6:      { unit: 'LF', material: 1.10, labor: 0 },
    lumber_2x8:      { unit: 'LF', material: 1.60, labor: 0 },
    lumber_2x10:     { unit: 'LF', material: 2.20, labor: 0 },
    lumber_2x12:     { unit: 'LF', material: 2.90, labor: 0 },
    stud:            { unit: 'EA', material: 5.50, labor: 0, note: 'Precut stud, size per framing spec' },
    header:          { unit: 'EA', material: 45,  labor: 25, note: 'Allowance per opening; see callout' },
    framing_labor:   { unit: 'SF', material: 0,   labor: 4.50, note: 'Rough framing labor per SF of plan area' },
    decking:         { unit: 'SF', material: 4.50, labor: 3.50, note: 'PT decking, installed' },
    deck_lumber:     { unit: 'LF', material: 2.40, labor: 1.20, note: 'PT joists/ledger/beam per LF' },
    deck_post:       { unit: 'EA', material: 35,  labor: 40, note: 'PT post incl. footing allowance' },
    guardrail:       { unit: 'LF', material: 28,  labor: 18 },
    deck_hardware:   { unit: 'EA', material: 150, labor: 0, note: 'Hangers, lags, flashing allowance per deck' }
  }
};

const DEFAULT_WASTE = { roofing: 10, siding: 10, framing: 10, deck: 10 };

// ---------------------------------------------------------------------------
// Quantity takeoff — pure geometry, no prices.
// ---------------------------------------------------------------------------

function parsePitch(pitch) {
  const m = /(\d+(?:\.\d+)?)\s*[/:]\s*12/.exec(String(pitch || ''));
  return m ? Number(m[1]) : null;
}

/** 6/12 -> sqrt(1 + (6/12)^2) = 1.118 */
function slopeFactor(pitch) {
  const rise = parsePitch(pitch);
  return rise === null ? 1 : Math.hypot(1, rise / 12);
}

function edgeLengths(edges) {
  const totals = { ridge: 0, hip: 0, valley: 0, eave: 0, rake: 0 };
  for (const e of edges) totals[e.type] += pm.dist(e.from, e.to);
  return totals;
}

function findEaveForPlane(plane, edges) {
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

/** Same layout walk as the S-2 sheet, plus slope-corrected member length. */
function rafterTakeoff(model) {
  const spacingFt = model.framing.rafter.spacingIn / 12;
  let count = 0;
  let planLf = 0;
  let slopeLf = 0;
  for (const plane of model.roof.planes) {
    const factor = slopeFactor(plane.pitch);
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
        const l = pm.dist(p1, p2);
        count++;
        planLf += l;
        slopeLf += l * factor;
      }
    }
  }
  return { count, planLf, slopeLf };
}

function roofTakeoff(model) {
  const planes = model.roof.planes.map(plane => {
    const planArea = pm.polygonArea(plane.vertices);
    const factor = slopeFactor(plane.pitch);
    return { id: plane.id, pitch: plane.pitch || null, planArea, slopeFactor: factor, slopeArea: planArea * factor };
  });
  const planArea = planes.reduce((s, p) => s + p.planArea, 0);
  const slopeArea = planes.reduce((s, p) => s + p.slopeArea, 0);
  return { planes, planArea, slopeArea, squares: slopeArea / 100, edges: edgeLengths(model.roof.edges) };
}

function wallTakeoff(model) {
  if (!model.walls || !(model.walls.facades || []).length) return null;
  const wallH = model.walls.height;
  const spacingFt = model.framing.stud.spacingIn / 12;
  let wallLf = 0, grossArea = 0, openingArea = 0, openingTrimLf = 0;
  let layoutStuds = 0, openingStuds = 0;
  const openings = [];
  for (const facade of model.walls.facades) {
    const length = pm.dist(facade.from, facade.to);
    wallLf += length;
    grossArea += length * wallH;
    layoutStuds += Math.floor(length / spacingFt) + 1;
    for (const o of facade.openings || []) {
      const h = Number.isFinite(o.height) ? o.height : (o.type === 'door' ? 6.67 : 4);
      openingArea += o.width * h;
      openingTrimLf += 2 * (o.width + h);
      openingStuds += 4; // 2 king + 2 trimmer per opening
      openings.push({ facade: facade.id, type: o.type || 'opening', width: o.width, height: h, assumedLocation: Boolean(o.assumedLocation) });
    }
  }
  return {
    wallLf,
    height: wallH,
    grossArea,
    openingArea,
    netArea: Math.max(0, grossArea - openingArea),
    plateLf: wallLf * 3, // double top plate + sole plate
    studCount: layoutStuds + openingStuds,
    openings,
    openingTrimLf
  };
}

function deckTakeoff(model) {
  const deck = model.deck;
  if (!deck) return null;
  const spacingFt = deck.joist.spacingIn / 12;
  let joistCount = 0;
  for (let t = spacingFt; t < deck.width - 1e-6; t += spacingFt) joistCount++;
  const postCount = deck.width > 12 ? 3 : 2; // matches the S-4 layout
  return {
    width: deck.width,
    depth: deck.depth,
    area: deck.width * deck.depth,
    joist: deck.joist,
    joistCount,
    joistLf: joistCount * deck.depth,
    ledgerLf: deck.width,
    beamLf: deck.width,
    beam: deck.beam,
    posts: deck.posts,
    postCount,
    guardrailLf: deck.guardrail ? deck.width + 2 * deck.depth : 0,
    estimated: Boolean(deck.estimated)
  };
}

/** Full quantity takeoff from a normalized plan model. No prices involved. */
function computeTakeoff(model) {
  return {
    roof: roofTakeoff(model),
    rafters: rafterTakeoff(model),
    walls: wallTakeoff(model),
    deck: deckTakeoff(model)
  };
}

// ---------------------------------------------------------------------------
// Pricing — takeoff quantities -> line items -> totals.
// ---------------------------------------------------------------------------

function lumberKey(size) {
  const key = `lumber_${String(size || '').toLowerCase().replace(/\s+/g, '')}`;
  return DEFAULT_PRICES.items[key] ? key : 'lumber_2x10';
}

function mergePrices(priceBook) {
  const merged = JSON.parse(JSON.stringify(DEFAULT_PRICES));
  for (const key of Object.keys(merged.items)) merged.items[key].source = 'PLACEHOLDER';
  if (priceBook && priceBook.items) {
    if (priceBook.currency) merged.currency = priceBook.currency;
    for (const [key, item] of Object.entries(priceBook.items)) {
      merged.items[key] = Object.assign({}, merged.items[key], item, { source: 'PRICEBOOK' });
    }
  }
  return merged;
}

/**
 * Build the priced estimate. options:
 *   waste    { roofing, siding, framing, deck } percentages
 *   markupPct overhead & profit applied to the subtotal
 *   taxPct    sales tax applied to the material subtotal
 *   sections  array filter, e.g. ['roofing'] — default: all present
 */
function buildEstimate(takeoff, priceBook, options = {}) {
  const prices = mergePrices(priceBook);
  const waste = Object.assign({}, DEFAULT_WASTE, options.waste || {});
  const wanted = options.sections || ['roofing', 'siding', 'framing', 'deck'];
  const lines = [];

  const add = (section, item, priceKey, qty, wastePct, notes) => {
    if (!(qty > 0)) return;
    const p = prices.items[priceKey];
    if (!p) throw new Error(`No price book entry for "${priceKey}"`);
    const grossQty = qty * (1 + wastePct / 100);
    const material = grossQty * (p.material || 0);
    const labor = grossQty * (p.labor || 0);
    lines.push({
      section, item, qty: round2(qty), wastePct, grossQty: round2(grossQty),
      unit: p.unit, materialUnit: p.material || 0, laborUnit: p.labor || 0,
      material: round2(material), labor: round2(labor), total: round2(material + labor),
      priceSource: p.source, notes: notes || p.note || ''
    });
  };

  const { roof, rafters, walls, deck } = takeoff;

  if (wanted.includes('roofing') && roof) {
    const w = waste.roofing;
    add('ROOFING', 'Shingles', 'shingles', roof.squares, w, `${round2(roof.slopeArea)} SF slope area`);
    add('ROOFING', 'Underlayment', 'underlayment', roof.squares, w);
    add('ROOFING', 'Starter strip', 'starter_strip', roof.edges.eave + roof.edges.rake, 5);
    add('ROOFING', 'Ridge cap', 'ridge_cap', roof.edges.ridge + roof.edges.hip, 5);
    add('ROOFING', 'Drip edge', 'drip_edge', roof.edges.eave + roof.edges.rake, 5);
    add('ROOFING', 'Ice & water shield (valleys)', 'ice_water_shield', roof.edges.valley, 10);
    add('ROOFING', 'Fasteners', 'roof_fasteners', roof.squares, 0);
  }

  if (wanted.includes('siding') && walls) {
    const w = waste.siding;
    add('SIDING', 'Siding', 'siding', walls.netArea, w, `${round2(walls.grossArea)} SF gross - ${round2(walls.openingArea)} SF openings`);
    add('SIDING', 'Housewrap', 'housewrap', walls.grossArea, 5);
    add('SIDING', 'Opening trim', 'opening_trim', walls.openingTrimLf, 10, `${walls.openings.length} openings`);
  }

  if (wanted.includes('framing')) {
    const w = waste.framing;
    if (rafters && rafters.count > 0) {
      const framing = options.framing || {};
      add('FRAMING', `Rafters (${framing.rafterSize || 'per spec'})`,
        lumberKey(framing.rafterSize), rafters.slopeLf, w,
        `${rafters.count} rafters, slope-corrected length`);
    }
    if (roof) {
      add('FRAMING', 'Ridge board', lumberKey(options.framing && options.framing.ridgeSize), roof.edges.ridge, w);
      add('FRAMING', 'Hip/valley members', lumberKey(options.framing && options.framing.hipValleySize), roof.edges.hip + roof.edges.valley, w);
    }
    if (walls) {
      add('FRAMING', 'Studs', 'stud', walls.studCount, w, 'Layout + king/trimmer studs');
      add('FRAMING', 'Wall plates', lumberKey(options.framing && options.framing.studSize), walls.plateLf, w, 'Double top + sole plate');
      add('FRAMING', 'Headers', 'header', walls.openings.length, 0, walls.openings.map(o => `${o.facade}:${o.type} ${o.width}ft`).join(', '));
      add('FRAMING', 'Framing labor', 'framing_labor', roof ? roof.planArea : walls.grossArea, 0);
    }
  }

  if (wanted.includes('deck') && deck) {
    const w = waste.deck;
    add('DECK', 'Decking', 'decking', deck.area, w, deck.estimated ? 'DIMENSIONS PHOTO-ESTIMATED - FIELD VERIFY' : '');
    add('DECK', `Joists (${deck.joist.size} @ ${deck.joist.spacingIn}" o.c.)`, 'deck_lumber', deck.joistLf, w);
    add('DECK', 'Ledger', 'deck_lumber', deck.ledgerLf, w);
    add('DECK', `Beam (${deck.beam})`, 'deck_lumber', deck.beamLf * 2, w, 'Two-ply beam');
    add('DECK', `Posts (${deck.posts})`, 'deck_post', deck.postCount, 0);
    add('DECK', 'Guardrail', 'guardrail', deck.guardrailLf, 5);
    add('DECK', 'Hardware & flashing', 'deck_hardware', 1, 0);
  }

  const materialSubtotal = round2(lines.reduce((s, l) => s + l.material, 0));
  const laborSubtotal = round2(lines.reduce((s, l) => s + l.labor, 0));
  const subtotal = round2(materialSubtotal + laborSubtotal);
  const markupPct = Number.isFinite(options.markupPct) ? options.markupPct : 10;
  const taxPct = Number.isFinite(options.taxPct) ? options.taxPct : 0;
  const markup = round2(subtotal * markupPct / 100);
  const tax = round2(materialSubtotal * taxPct / 100);
  const total = round2(subtotal + markup + tax);
  const placeholderCount = lines.filter(l => l.priceSource === 'PLACEHOLDER').length;

  return {
    currency: prices.currency,
    waste,
    lines,
    totals: { materialSubtotal, laborSubtotal, subtotal, markupPct, markup, taxPct, tax, total },
    placeholderCount,
    disclaimer: 'PRELIMINARY ESTIMATE - NOT A BID. Quantities derive from HOVER photogrammetry ' +
      'and stated waste factors; field verify before ordering. ' +
      (placeholderCount > 0
        ? `${placeholderCount} line(s) use PLACEHOLDER unit costs - supply a price book (--prices) with your real costs.`
        : 'Unit costs from the supplied price book.')
  };
}

function round2(n) { return Math.round(n * 100) / 100; }

// ---------------------------------------------------------------------------
// Renderers
// ---------------------------------------------------------------------------

function toCsv(estimate) {
  const esc = v => /[",\n]/.test(String(v)) ? `"${String(v).replace(/"/g, '""')}"` : String(v);
  const rows = [['section', 'item', 'qty', 'unit', 'waste_pct', 'gross_qty', 'material_unit', 'labor_unit', 'material', 'labor', 'total', 'price_source', 'notes']];
  for (const l of estimate.lines) {
    rows.push([l.section, l.item, l.qty, l.unit, l.wastePct, l.grossQty, l.materialUnit, l.laborUnit, l.material, l.labor, l.total, l.priceSource, l.notes]);
  }
  const t = estimate.totals;
  rows.push([], ['', 'MATERIAL SUBTOTAL', '', '', '', '', '', '', t.materialSubtotal]);
  rows.push(['', 'LABOR SUBTOTAL', '', '', '', '', '', '', '', t.laborSubtotal]);
  rows.push(['', `OVERHEAD & PROFIT (${t.markupPct}%)`, '', '', '', '', '', '', '', '', t.markup]);
  rows.push(['', `TAX ON MATERIALS (${t.taxPct}%)`, '', '', '', '', '', '', '', '', t.tax]);
  rows.push(['', 'TOTAL', '', '', '', '', '', '', '', '', t.total]);
  return rows.map(r => r.map(esc).join(',')).join('\n') + '\n';
}

function toMarkdown(model, takeoff, estimate) {
  const p = model.project;
  const t = estimate.totals;
  const money = n => `$${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  const out = [];
  out.push(`# Preliminary Estimate — ${p.name || 'Unnamed Project'}`);
  out.push('');
  if (p.address) out.push(`**Address:** ${p.address}  `);
  if (p.jobId) out.push(`**HOVER Job:** #${p.jobId}  `);
  if (p.date) out.push(`**Date:** ${p.date}  `);
  out.push('');
  out.push('## Key quantities');
  out.push('');
  out.push(`- Roof: ${round2(takeoff.roof.slopeArea)} SF slope area (${round2(takeoff.roof.squares)} squares), ` +
    `ridge ${round2(takeoff.roof.edges.ridge)} LF, eaves ${round2(takeoff.roof.edges.eave)} LF, ` +
    `rakes ${round2(takeoff.roof.edges.rake)} LF, hips ${round2(takeoff.roof.edges.hip)} LF, valleys ${round2(takeoff.roof.edges.valley)} LF`);
  if (takeoff.rafters.count) out.push(`- Rafters: ${takeoff.rafters.count} @ ${round2(takeoff.rafters.slopeLf)} LF total (slope-corrected)`);
  if (takeoff.walls) out.push(`- Walls: ${round2(takeoff.walls.netArea)} SF net siding (${round2(takeoff.walls.grossArea)} gross), ` +
    `${takeoff.walls.studCount} studs, ${takeoff.walls.openings.length} openings`);
  if (takeoff.deck) out.push(`- Deck: ${round2(takeoff.deck.area)} SF, ${takeoff.deck.joistCount} joists, ` +
    `${takeoff.deck.postCount} posts${takeoff.deck.estimated ? ' — PHOTO-ESTIMATED, FIELD VERIFY' : ''}`);
  out.push('');
  out.push('## Line items');
  out.push('');
  out.push('| Section | Item | Qty | Unit | Waste | Material | Labor | Total | Price source |');
  out.push('|---|---|---:|---|---:|---:|---:|---:|---|');
  for (const l of estimate.lines) {
    out.push(`| ${l.section} | ${l.item} | ${l.qty} | ${l.unit} | ${l.wastePct}% | ${money(l.material)} | ${money(l.labor)} | ${money(l.total)} | ${l.priceSource} |`);
  }
  out.push('');
  out.push(`- Material subtotal: **${money(t.materialSubtotal)}**`);
  out.push(`- Labor subtotal: **${money(t.laborSubtotal)}**`);
  out.push(`- Overhead & profit (${t.markupPct}%): **${money(t.markup)}**`);
  out.push(`- Tax on materials (${t.taxPct}%): **${money(t.tax)}**`);
  out.push(`- **TOTAL: ${money(t.total)}** (${estimate.currency})`);
  out.push('');
  out.push(`> ${estimate.disclaimer}`);
  out.push('');
  return out.join('\n');
}

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------

function parseArgs(argv) {
  const args = { _: [] };
  const valued = ['--prices', '--out', '--date', '--sections', '--waste-roof', '--waste-siding', '--waste-framing', '--waste-deck', '--markup', '--tax', '--units'];
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--print-prices') args.printPrices = true;
    else if (valued.includes(a)) args[a.slice(2)] = argv[++i];
    else if (a.startsWith('--')) throw new Error(`Unknown option ${a}`);
    else args._.push(a);
  }
  return args;
}

function main() {
  const args = parseArgs(process.argv.slice(2));

  if (args.printPrices) {
    process.stdout.write(JSON.stringify(DEFAULT_PRICES, null, 2) + '\n');
    return;
  }

  const inputPath = args._[0];
  if (!inputPath) {
    console.error('Usage: node scripts/hover/estimate.js <plan-model.json> [--prices book.json] [--out dir] [--markup 10] [--tax 0]');
    process.exit(1);
  }

  const raw = JSON.parse(fs.readFileSync(inputPath, 'utf8'));
  const model = pm.normalize(raw, { units: args.units });
  if (args.date) model.project.date = args.date;

  const priceBook = args.prices ? JSON.parse(fs.readFileSync(args.prices, 'utf8')) : null;
  const num = v => (v === undefined ? undefined : Number(v));
  const takeoff = computeTakeoff(model);
  const estimate = buildEstimate(takeoff, priceBook, {
    waste: {
      ...(args['waste-roof'] !== undefined ? { roofing: num(args['waste-roof']) } : {}),
      ...(args['waste-siding'] !== undefined ? { siding: num(args['waste-siding']) } : {}),
      ...(args['waste-framing'] !== undefined ? { framing: num(args['waste-framing']) } : {}),
      ...(args['waste-deck'] !== undefined ? { deck: num(args['waste-deck']) } : {})
    },
    markupPct: num(args.markup),
    taxPct: num(args.tax),
    sections: args.sections ? args.sections.split(',').map(s => s.trim()) : undefined,
    framing: {
      rafterSize: model.framing.rafter.size,
      ridgeSize: model.framing.ridge,
      hipValleySize: model.framing.hipValley,
      studSize: model.framing.stud.size
    }
  });

  const outDir = args.out || path.dirname(path.resolve(inputPath));
  fs.mkdirSync(outDir, { recursive: true });
  const payload = { project: model.project, takeoff, estimate };
  fs.writeFileSync(path.join(outDir, 'estimate.json'), JSON.stringify(payload, null, 2));
  fs.writeFileSync(path.join(outDir, 'estimate.csv'), toCsv(estimate));
  fs.writeFileSync(path.join(outDir, 'estimate.md'), toMarkdown(model, takeoff, estimate));

  console.log(`Estimate written to ${outDir}`);
  console.log(`  estimate.json / estimate.csv / estimate.md`);
  console.log(`  Roof: ${round2(takeoff.roof.squares)} squares | Total: ${estimate.currency} ${estimate.totals.total.toFixed(2)}`);
  if (estimate.placeholderCount > 0) {
    console.log(`  WARNING: ${estimate.placeholderCount} line(s) priced with PLACEHOLDER unit costs — supply --prices with real costs.`);
  }
}

if (require.main === module) {
  try {
    main();
  } catch (err) {
    console.error(err.code === 'NEEDS_ADAPTER' || err.code === 'INVALID_PLAN_MODEL' ? err.message : err.stack || err.message);
    process.exit(1);
  }
}

module.exports = {
  DEFAULT_PRICES,
  DEFAULT_WASTE,
  parsePitch,
  slopeFactor,
  computeTakeoff,
  buildEstimate,
  toCsv,
  toMarkdown
};
