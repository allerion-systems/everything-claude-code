/**
 * Tests for scripts/edge-glasses.js (the CLI demo runner)
 *
 * Run with: node tests/scripts/edge-glasses.test.js
 */

const assert = require('assert');
const path = require('path');
const { spawnSync } = require('child_process');

const scriptPath = path.join(__dirname, '..', '..', 'scripts', 'edge-glasses.js');
const { DEMO_FRAMES, parseGrants, runDemo } = require(scriptPath);

async function asyncTest(name, fn) {
  try {
    await fn();
    console.log(`  ✓ ${name}`);
    return true;
  } catch (err) {
    console.log(`  ✗ ${name}`);
    console.log(`    Error: ${err.message}`);
    return false;
  }
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

async function runTests() {
  console.log('\n=== Testing edge-glasses.js CLI ===\n');
  let passed = 0;
  let failed = 0;

  if (test('parseGrants splits a comma list and trims', () => {
    assert.deepStrictEqual(parseGrants('capture.camera, share.external ,'), ['capture.camera', 'share.external']);
    assert.deepStrictEqual(parseGrants(''), []);
    assert.deepStrictEqual(parseGrants(undefined), []);
  })) passed++; else failed++;

  if (await asyncTest('runDemo produces one tick per demo frame, offline, zero tokens', async () => {
    const result = await runDemo();
    assert.strictEqual(result.endpoint, 'offline');
    assert.strictEqual(result.ticks.length, DEMO_FRAMES.length);
    for (const tick of result.ticks) {
      assert.ok(tick.latency.withinBudget, 'each tick within budget');
    }
  })) passed++; else failed++;

  if (await asyncTest('runDemo learns at least one reflex from the repeated scene', async () => {
    const result = await runDemo();
    assert.ok(result.learning.reflexes.length >= 1, 'reflex learned across repeated frames');
  })) passed++; else failed++;

  if (await asyncTest('runDemo redacts PII in the share tick', async () => {
    const result = await runDemo();
    const shareTick = result.ticks.find(t => t.executed.some(e => e.action.type === 'share.message'));
    assert.ok(shareTick, 'a share tick exists');
    const share = shareTick.executed.find(e => e.action.type === 'share.message');
    assert.ok(!/555-123-4567/.test(JSON.stringify(share.action)), 'phone number redacted');
  })) passed++; else failed++;

  if (test('CLI runs end-to-end and prints zero token banner', () => {
    const res = spawnSync('node', [scriptPath], { encoding: 'utf8' });
    assert.strictEqual(res.status, 0, `exit 0, got ${res.status}: ${res.stderr}`);
    assert.ok(/cloud tokens spent: 0/.test(res.stdout), 'banner shows zero tokens');
    assert.ok(/reflection/.test(res.stdout), 'reflection section printed');
  })) passed++; else failed++;

  if (test('CLI --json emits valid JSON with a ticks array', () => {
    const res = spawnSync('node', [scriptPath, '--json'], { encoding: 'utf8' });
    assert.strictEqual(res.status, 0);
    const parsed = JSON.parse(res.stdout);
    assert.ok(Array.isArray(parsed.ticks));
    assert.strictEqual(parsed.endpoint, 'offline');
  })) passed++; else failed++;

  console.log(`\nResults: Passed: ${passed}, Failed: ${failed}`);
  process.exit(failed > 0 ? 1 : 0);
}

runTests();
