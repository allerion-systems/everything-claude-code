/**
 * Tests for site topo (scripts/hover/site-topo.js), site scout
 * (scripts/hover/site-scout.js) and deck support (plan-model, S-4 sheet,
 * SketchUp codegen). All offline - network functions are not called.
 *
 * Run with: node tests/hover/site-and-deck.test.js
 */

const assert = require('assert');
const path = require('path');
const fs = require('fs');
const { spawnSync } = require('child_process');

const pm = require('../../scripts/hover/plan-model');
const { generate, buildDeckPlan, deckRect } = require('../../scripts/hover/generate-plans');
const { generateSketchupCode } = require('../../scripts/hover/sketchup-code');
const { gridCoords, toRelativeGrid } = require('../../scripts/hover/site-topo');
const { osmToFootprints, starterPlanModel } = require('../../scripts/hover/site-scout');

const fixture = JSON.parse(
  fs.readFileSync(path.join(__dirname, 'fixtures', 'gable-plan-model.json'), 'utf8')
);

function withDeck(model) {
  const clone = JSON.parse(JSON.stringify(model));
  clone.deck = {
    attachedTo: 'F3',
    origin: [12, 28],
    direction: [0, 1],
    width: 16,
    depth: 12,
    height: 2.5,
    estimated: true
  };
  return clone;
}

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
  console.log('\n=== Testing site topo, site scout, and deck support ===\n');

  let passed = 0;
  let failed = 0;
  const t = (name, fn) => { if (test(name, fn)) passed++; else failed++; };

  console.log('Topo grid math:');

  t('gridCoords builds a centered row-major grid', () => {
    const grid = gridCoords(100, 50);
    assert.strictEqual(grid.length, 3);
    assert.strictEqual(grid[0].length, 3);
    assert.deepStrictEqual(grid[0][0], [-50, 50]);   // NW corner
    assert.deepStrictEqual(grid[1][1], [0, 0]);      // center
    assert.deepStrictEqual(grid[2][2], [50, -50]);   // SE corner
  });

  t('toRelativeGrid uses the center point as datum', () => {
    const { datumFt, grid } = toRelativeGrid([[600, 601], [602, 604], [598, 600]]);
    assert.strictEqual(datumFt, 604);
    assert.strictEqual(grid[1][1], 0);
    assert.strictEqual(grid[0][0], -4);
  });

  console.log('\nSite scout (OSM):');

  t('osmToFootprints converts nearby building ways to local feet', () => {
    const lat = 40, lon = -100;
    const dLat = 40 / 364000; // ~40 ft north
    const osm = {
      elements: [
        { type: 'node', id: 1, lat: lat, lon: lon },
        { type: 'node', id: 2, lat: lat + dLat, lon: lon },
        { type: 'node', id: 3, lat: lat + dLat, lon: lon + dLat },
        { type: 'node', id: 4, lat: lat, lon: lon + dLat },
        { type: 'way', id: 99, nodes: [1, 2, 3, 4, 1], tags: { building: 'house' } }
      ]
    };
    const fps = osmToFootprints(osm, lat, lon);
    assert.strictEqual(fps.length, 1);
    assert.strictEqual(fps[0].footprint.length, 4);
    const box = pm.bbox(fps[0].footprint);
    assert.ok(Math.abs(box.height - 40) < 1, `expected ~40ft tall, got ${box.height}`);
  });

  t('starterPlanModel produces a valid, flagged plan model', () => {
    const model = pm.normalize(starterPlanModel('1 Test St', [[0, 0], [40, 0], [40, 28], [0, 28]]));
    assert.strictEqual(model.walls.facades.length, 4);
    assert.ok(model.project.name.includes('APPROXIMATION'));
    assert.ok(model.scout.note.includes('HOVER'));
  });

  console.log('\nDeck - plan model + S-4 sheet:');

  const deckModel = pm.normalize(withDeck(fixture));

  t('deck defaults are filled and invalid decks rejected', () => {
    assert.strictEqual(deckModel.deck.joist.size, '2x8');
    assert.strictEqual(deckModel.deck.guardrail, true);
    assert.throws(() => pm.normalize({ ...JSON.parse(JSON.stringify(fixture)), deck: { width: -1 } }), /deck\.width/);
  });

  t('S-4 deck framing plan is generated with ledger, joists and notes', () => {
    const sheet = buildDeckPlan(deckModel);
    assert.strictEqual(sheet.sheetNo, 'S-4');
    assert.ok(sheet.joistCount >= 10 && sheet.joistCount <= 13, `joistCount=${sheet.joistCount}`);
    const outputs = generate(deckModel);
    assert.deepStrictEqual(outputs.map(o => o.sheet.sheetNo), ['S-1', 'S-2', 'S-3', 'S-4']);
    const dxf = outputs[3].dxf;
    assert.ok(dxf.includes('LEDGER'));
    assert.ok(dxf.includes('2x8 JOISTS @ 16" O.C.'));
    assert.ok(dxf.includes('ESTIMATED FROM HOVER CAPTURE PHOTOS'));
    assert.ok(outputs[3].svg.includes('DECK FRAMING PLAN'));
  });

  t('deck lateral axis is a true perpendicular (not a reflection) for any direction', () => {
    // regression: lateral used to be [d[1], d[0]] (a reflection), which for a
    // non-cardinal direction like [3,4] collapses the deck toward a line.
    const clone = JSON.parse(JSON.stringify(fixture));
    clone.deck = { origin: [12, 28], direction: [3, 4], width: 10, depth: 8, height: 2.5 };
    const model = pm.normalize(clone);
    const { A, B, C, D, d, lateral } = deckRect(model.deck);
    const dot = d[0] * lateral[0] + d[1] * lateral[1];
    assert.ok(Math.abs(dot) < 1e-9, `lateral not perpendicular to direction (dot=${dot})`);
    const area = pm.polygonArea([A, B, C, D]);
    assert.ok(Math.abs(area - 80) < 1e-6, `deck rect area should be 10x8=80, got ${area}`);
  });

  t('deck lateral keeps the established side for cardinal directions', () => {
    // direction [0,1] (north) must keep lateral [1,0] (east) so existing
    // models render on the same side as before the perpendicular fix
    const { lateral } = deckRect(deckModel.deck);
    assert.deepStrictEqual(lateral, [1, 0]);
  });

  t('invalid deck.direction is rejected with a clear error naming the input', () => {
    for (const bad of ['north', [0, 0], [1], ['a', 'b']]) {
      const clone = JSON.parse(JSON.stringify(fixture));
      clone.deck = { origin: [12, 28], direction: bad, width: 16, depth: 12 };
      assert.throws(
        () => pm.normalize(clone),
        err => err.code === 'INVALID_PLAN_MODEL' &&
          /deck\.direction/.test(err.message) &&
          err.message.includes(JSON.stringify(bad)),
        `expected INVALID_PLAN_MODEL for direction ${JSON.stringify(bad)}`
      );
    }
    // non-unit vectors are normalized rather than rejected
    const clone = JSON.parse(JSON.stringify(fixture));
    clone.deck = { origin: [12, 28], direction: [0, 2], width: 16, depth: 12 };
    assert.deepStrictEqual(pm.normalize(clone).deck.direction, [0, 1]);
  });

  t('models without a deck still produce the 3-sheet set', () => {
    const outputs = generate(pm.normalize(JSON.parse(JSON.stringify(fixture))));
    assert.deepStrictEqual(outputs.map(o => o.sheet.sheetNo), ['S-1', 'S-2', 'S-3']);
  });

  console.log('\nSketchUp codegen - terrain + deck:');

  const topo = {
    stepFt: 25,
    datumFt: 600,
    rows: 3,
    cols: 3,
    grid: [[-1, 0, 0.5], [0, 0, 0.2], [0.4, 0.1, -0.3]]
  };
  const code = generateSketchupCode(deckModel, { topo });

  t('emits Terrain and Deck groups with guardrail on open sides only', () => {
    assert.ok(code.includes('"Terrain"'));
    assert.ok(code.includes('"Deck"'));
    assert.ok(code.includes('Deck_Platform'));
    assert.ok(code.includes('Deck_Post_'));
    assert.ok(code.includes('RAIL_SIDES'));
    // ledger side (deck direction [0,1] -> house to the south) gets no rail
    assert.ok(code.includes('s != "S"'), 'ledger side "S" must be excluded from RAIL_SIDES');
    assert.ok(code.includes('"deck": True'));
    assert.ok(code.includes('"terrain": True'));
  });

  t('terrain grid is centered under the footprint', () => {
    // house center is (240, 168) inches; middle topo point should land there
    assert.ok(code.includes('(240, 168, 0)'), 'center terrain point at house center');
  });

  t('deck+terrain Python stays sandbox-safe and compiles', () => {
    assert.ok(!/^\s*import /m.test(code));
    assert.ok(!code.includes('__'));
    const py = spawnSync('python3', ['-c', 'import sys, py_compile, tempfile, os\nf = tempfile.NamedTemporaryFile(suffix=".py", delete=False, mode="w")\nf.write(sys.stdin.read())\nf.close()\npy_compile.compile(f.name, doraise=True)\nos.unlink(f.name)'], { input: code, encoding: 'utf8' });
    if (!(py.error && py.error.code === 'ENOENT')) {
      assert.strictEqual(py.status, 0, `python syntax error: ${py.stderr}`);
    }
  });

  console.log(`\nPassed: ${passed}`);
  console.log(`Failed: ${failed}`);
  process.exit(failed > 0 ? 1 : 0);
}

runTests();
