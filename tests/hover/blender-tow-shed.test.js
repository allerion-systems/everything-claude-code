/**
 * Tests for the Blender towable-shed model script
 * (scripts/hover/blender-tow-shed.py). Offline: checks the PARAMS contract
 * and that the file is valid Python. Blender itself is not required.
 *
 * Run with: node tests/hover/blender-tow-shed.test.js
 */

const assert = require('assert');
const path = require('path');
const fs = require('fs');
const { spawnSync } = require('child_process');

const script = path.join(__dirname, '..', '..', 'scripts', 'hover', 'blender-tow-shed.py');

function test(name, fn) {
  try {
    fn();
    console.log(`  ok - ${name}`);
  } catch (err) {
    console.error(`  FAIL - ${name}\n    ${err.message}`);
    process.exitCode = 1;
  }
}

test('script exists', () => {
  assert.ok(fs.existsSync(script), `missing ${script}`);
});

test('declares every editable PARAMS block', () => {
  const src = fs.readFileSync(script, 'utf8');
  for (const key of ['FENCE', 'GATE', 'SHED', 'HITCH', 'PORT', 'TOPO']) {
    assert.ok(new RegExp(`^${key}\\s*=`, 'm').test(src), `${key} not declared`);
  }
});

test('hitch geometry keeps tongue weight positive', () => {
  const src = fs.readFileSync(script, 'utf8');
  const m = src.match(/"axle_from_front":\s*([0-9.]+)/);
  assert.ok(m, 'axle_from_front missing');
  assert.ok(Number(m[1]) > 0.5, 'axle must sit behind the balance point (>0.5)');
});

test('is valid Python (py_compile)', () => {
  const r = spawnSync('python3', ['-m', 'py_compile', script], { encoding: 'utf8' });
  if (r.error && r.error.code === 'ENOENT') {
    console.log('    (python3 not found - skipped)');
    return;
  }
  assert.strictEqual(r.status, 0, r.stderr);
});
