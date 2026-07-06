/**
 * Tests for the HOVER construction drawing pipeline:
 *   scripts/hover/dxf.js, scripts/hover/plan-model.js, scripts/hover/generate-plans.js
 *
 * Run with: node tests/hover/hover-plans.test.js
 */

const assert = require('assert');
const path = require('path');
const fs = require('fs');

const { DxfWriter } = require('../../scripts/hover/dxf');
const pm = require('../../scripts/hover/plan-model');
const { generate } = require('../../scripts/hover/generate-plans');

const fixture = JSON.parse(
  fs.readFileSync(path.join(__dirname, 'fixtures', 'gable-plan-model.json'), 'utf8')
);

function test(name, fn) {
  try {
    fn();
    console.log(`  ✓ ${name}`);
    return true;
  } catch (err) {
    console.log(`  ✗ ${name}`);
    console.log(`    Error: ${err.message}`);
    return false;
  }
}

function runTests() {
  console.log('\n=== Testing HOVER construction drawing pipeline ===\n');

  let passed = 0;
  let failed = 0;
  const t = (name, fn) => { if (test(name, fn)) passed++; else failed++; };

  console.log('Geometry helpers:');

  t('ftIn formats feet-inches to nearest 1/4"', () => {
    assert.strictEqual(pm.ftIn(24.5), `24'-6"`);
    assert.strictEqual(pm.ftIn(0), `0'-0"`);
    assert.strictEqual(pm.ftIn(3.0208), `3'-0 1/4"`);
    assert.strictEqual(pm.ftIn(9.999), `10'-0"`);
  });

  t('polygonArea and centroid on a rectangle', () => {
    const rect = [[0, 0], [40, 0], [40, 28], [0, 28]];
    assert.strictEqual(pm.polygonArea(rect), 40 * 28);
    assert.deepStrictEqual(pm.centroid(rect), [20, 14]);
  });

  t('clipLineToPolygon clips a vertical line through a rectangle', () => {
    const rect = [[0, 0], [40, 0], [40, 14], [0, 14]];
    const segments = pm.clipLineToPolygon([10, -5], [0, 1], rect);
    assert.strictEqual(segments.length, 1);
    const [[, y1], [, y2]] = segments[0].flatMap(p => [p]).length === 2 ? segments[0] : segments[0];
    assert.ok(Math.abs(Math.abs(y2 - y1) - 14) < 1e-6, `expected span 14, got ${Math.abs(y2 - y1)}`);
  });

  t('clipLineToPolygon returns nothing outside the polygon', () => {
    const rect = [[0, 0], [10, 0], [10, 10], [0, 10]];
    const segments = pm.clipLineToPolygon([50, 0], [0, 1], rect);
    assert.strictEqual(segments.length, 0);
  });

  console.log('\nDXF writer:');

  t('emits valid R12 skeleton with layers, entities and EOF', () => {
    const dxf = new DxfWriter();
    dxf.addLayer('TEST', 1, 'DASHED');
    dxf.line('TEST', 0, 0, 10, 10);
    dxf.polyline('TEST', [[0, 0], [1, 0], [1, 1]], true);
    dxf.text('TEST', 5, 5, 0.25, 'HELLO', { align: 'center' });
    const out = dxf.toString();
    assert.ok(out.includes('AC1009'));
    assert.ok(out.includes('TEST'));
    assert.ok(out.includes('POLYLINE'));
    assert.ok(out.includes('SEQEND'));
    assert.ok(out.trim().endsWith('EOF'));
    // group codes and values must alternate line by line -> even line count
    assert.strictEqual(out.trim().split('\n').length % 2, 0);
  });

  t('rejects non-finite coordinates', () => {
    const dxf = new DxfWriter();
    assert.throws(() => dxf.line('X', 0, 0, NaN, 5), /Non-finite/);
  });

  console.log('\nPlan model normalization:');

  t('normalizes the neutral fixture and spreads unplaced openings', () => {
    const model = pm.normalize(JSON.parse(JSON.stringify(fixture)));
    assert.strictEqual(model.roof.planes.length, 2);
    const south = model.walls.facades[0];
    assert.ok(south.openings.every(o => Number.isFinite(o.offset)));
    assert.ok(south.openings.some(o => o.assumedLocation));
    const east = model.walls.facades[1];
    assert.strictEqual(east.openings[0].offset, 6);
    assert.ok(!east.openings[0].assumedLocation);
    assert.strictEqual(model.framing.ridge, '2x10');
    assert.ok(model.framing.headers.length > 0);
  });

  t('derives facades from footprint when facades are missing', () => {
    const clone = JSON.parse(JSON.stringify(fixture));
    delete clone.walls.facades;
    const model = pm.normalize(clone);
    assert.strictEqual(model.walls.facades.length, 4);
    assert.strictEqual(model.walls.facades[0].name, 'SOUTH');
  });

  t('converts a HOVER-style payload (inches, {x,y} points, typed lines)', () => {
    const hover = {
      job_id: 99,
      address: { line_1: '1 Elm St', city: 'Austin', region: 'TX' },
      roof: {
        facets: [
          { pitch: '8/12', points: [{ x: 0, y: 0 }, { x: 480, y: 0 }, { x: 480, y: 168 }, { x: 0, y: 168 }] },
          { pitch: '8/12', points: [{ x: 0, y: 168 }, { x: 480, y: 168 }, { x: 480, y: 336 }, { x: 0, y: 336 }] }
        ],
        lines: [
          { type: 'RIDGE', points: [{ x: 0, y: 168 }, { x: 480, y: 168 }] },
          { type: 'EAVE', points: [{ x: 0, y: 0 }, { x: 480, y: 0 }] }
        ]
      }
    };
    const model = pm.normalize(hover);
    const box = pm.bbox(model.roof.planes.flatMap(p => p.vertices));
    assert.ok(Math.abs(box.width - 40) < 1e-6, `expected 40ft wide, got ${box.width}`);
    assert.strictEqual(model.roof.edges.filter(e => e.type === 'ridge').length, 1);
    assert.strictEqual(model.project.jobId, '99');
    assert.ok(model.project.address.includes('Austin'));
  });

  t('throws NEEDS_ADAPTER with guidance on unrecognized payloads', () => {
    assert.throws(
      () => pm.normalize({ some: 'unrelated json' }),
      err => err.code === 'NEEDS_ADAPTER' && /plan-model\.js/.test(err.message)
    );
  });

  t('validation rejects broken geometry with actionable messages', () => {
    assert.throws(
      () => pm.normalize({ roof: { planes: [{ id: 'A', vertices: [[0, 0], [1, 1]] }] } }),
      /at least 3 vertices/
    );
  });

  console.log('\nSheet generation:');

  const model = pm.normalize(JSON.parse(JSON.stringify(fixture)));
  const outputs = generate(model);

  t('produces roof plan, roof framing plan, and wall framing sheets', () => {
    assert.deepStrictEqual(outputs.map(o => o.sheet.sheetNo), ['S-1', 'S-2', 'S-3']);
  });

  t('roof plan DXF has classified edge layers and an area schedule', () => {
    const dxf = outputs[0].dxf;
    assert.ok(dxf.includes('A-ROOF-RIDG'));
    assert.ok(dxf.includes('A-ROOF-EAVE'));
    assert.ok(dxf.includes('ROOF AREA SCHEDULE'));
    assert.ok(dxf.includes('6/12'));
    assert.ok(dxf.trim().endsWith('EOF'));
  });

  t('roof framing plan lays out a plausible rafter count with callouts', () => {
    const framingSheet = outputs[1];
    // 40' ridge @ 16" o.c. => ~29 bays per plane, 2 planes
    assert.ok(framingSheet.sheet.rafterCount >= 40 && framingSheet.sheet.rafterCount <= 80,
      `rafterCount=${framingSheet.sheet.rafterCount}`);
    assert.ok(framingSheet.dxf.includes('2x8 RAFTERS @ 16" O.C.'));
    assert.ok(framingSheet.dxf.includes('2x10 RIDGE'));
  });

  t('wall framing sheet includes header schedule with marks', () => {
    const dxf = outputs[2].dxf;
    assert.ok(dxf.includes('HEADER SCHEDULE'));
    assert.ok(dxf.includes('H1'));
    assert.ok(dxf.includes('FACADE F1'));
  });

  t('SVG sheets carry title block, scale and the not-for-construction note', () => {
    for (const { svg, sheet } of outputs) {
      assert.ok(svg.startsWith('<?xml'), 'svg xml header');
      assert.ok(svg.includes(sheet.sheetNo));
      assert.ok(svg.includes(`= 1'-0&quot;`), 'scale label present');
      assert.ok(svg.includes('NOT FOR CONSTRUCTION'));
      assert.ok(svg.includes('SAMPLE RESIDENCE'));
    }
  });

  t('SVG geometry stays inside the sheet bounds', () => {
    for (const { svg } of outputs) {
      const coords = [...svg.matchAll(/x1="(-?[\d.]+)" y1="(-?[\d.]+)" x2="(-?[\d.]+)" y2="(-?[\d.]+)"/g)];
      assert.ok(coords.length > 0);
      for (const m of coords) {
        for (let i = 1; i <= 4; i++) {
          const v = Number(m[i]);
          assert.ok(v >= -0.01 && v <= 36.01, `coordinate ${v} outside sheet`);
        }
      }
    }
  });

  console.log(`\nPassed: ${passed}`);
  console.log(`Failed: ${failed}`);
  process.exit(failed > 0 ? 1 : 0);
}

runTests();
