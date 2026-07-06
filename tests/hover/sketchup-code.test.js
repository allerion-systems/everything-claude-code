/**
 * Tests for scripts/hover/sketchup-code.js — the plan-model -> SketchUp
 * (Trimble MCP build_model Python) code generator.
 *
 * Run with: node tests/hover/sketchup-code.test.js
 */

const assert = require('assert');
const path = require('path');
const fs = require('fs');
const { spawnSync } = require('child_process');

const pm = require('../../scripts/hover/plan-model');
const { generateSketchupCode, wallSpecs, roofSpecs } = require('../../scripts/hover/sketchup-code');

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
  console.log('\n=== Testing SketchUp code generator ===\n');

  let passed = 0;
  let failed = 0;
  const t = (name, fn) => { if (test(name, fn)) passed++; else failed++; };

  const model = pm.normalize(JSON.parse(JSON.stringify(fixture)));
  const code = generateSketchupCode(model);

  console.log('Wall and roof specs:');

  t('produces one wall spec per facade with inch dimensions', () => {
    const walls = wallSpecs(model);
    assert.strictEqual(walls.length, 4);
    const south = walls[0];
    assert.strictEqual(south.lengthIn, 480);  // 40 ft
    assert.strictEqual(south.heightIn, 96);   // 8 ft
    assert.strictEqual(south.openings.length, 3);
  });

  t('roof planes are lifted to wall top and sloped per pitch', () => {
    const roofs = roofSpecs(model);
    assert.strictEqual(roofs.length, 2);
    const zs = roofs[0].verts.map(v => v[2]);
    assert.strictEqual(Math.min(...zs), 96); // eave at wall top (8 ft)
    // 6/12 pitch over 14 ft of run = 7 ft rise -> 96 + 84 = 180
    assert.strictEqual(Math.max(...zs), 180);
  });

  t('clockwise footprints are re-oriented so walls face inward', () => {
    const clone = JSON.parse(JSON.stringify(fixture));
    clone.walls.footprint = [...clone.walls.footprint].reverse();
    clone.walls.facades = undefined;
    const walls = wallSpecs(pm.normalize(clone));
    assert.strictEqual(walls.length, 4);
    // regardless of winding, every wall keeps positive length
    for (const w of walls) assert.ok(w.lengthIn > 0);
  });

  console.log('\nGenerated Python:');

  t('contains the model structure and camera', () => {
    assert.ok(code.includes('make_wall_geom'));
    assert.ok(code.includes('face_add_inner_loop'), 'openings cut via inner loops');
    assert.ok(code.includes('Residence'));
    assert.ok(code.includes('RoofPlane_A'));
    assert.ok(code.includes('model.set_camera(cam)'));
    assert.ok(code.includes('result = {'));
  });

  t('respects the connector sandbox (no imports, exec, open, type)', () => {
    assert.ok(!/^\s*import /m.test(code));
    assert.ok(!/\b(exec|eval|open|setattr)\(/.test(code));
    assert.ok(!code.includes('__'));
  });

  t('generated Python compiles (python3 py_compile)', () => {
    const py = spawnSync('python3', ['-c', 'import sys, py_compile, tempfile, os\nf = tempfile.NamedTemporaryFile(suffix=".py", delete=False, mode="w")\nf.write(sys.stdin.read())\nf.close()\npy_compile.compile(f.name, doraise=True)\nos.unlink(f.name)'], { input: code, encoding: 'utf8' });
    if (py.error && py.error.code === 'ENOENT') {
      console.log('    (python3 not available - syntax check skipped)');
      return;
    }
    assert.strictEqual(py.status, 0, `python syntax error: ${py.stderr}`);
  });

  t('roof-only models (no walls) still generate valid code', () => {
    const clone = JSON.parse(JSON.stringify(fixture));
    clone.walls = null;
    const roofOnly = generateSketchupCode(pm.normalize(clone));
    assert.ok(roofOnly.includes('no wall data'));
    assert.ok(roofOnly.includes('RoofPlane_A'));
  });

  console.log(`\nPassed: ${passed}`);
  console.log(`Failed: ${failed}`);
  process.exit(failed > 0 ? 1 : 0);
}

runTests();
