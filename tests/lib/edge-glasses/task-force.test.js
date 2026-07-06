/**
 * Tests for scripts/lib/edge-glasses/task-force.js
 *
 * Run with: node tests/lib/edge-glasses/task-force.test.js
 */

const assert = require('assert');
const path = require('path');

const base = path.join(__dirname, '..', '..', '..', 'scripts', 'lib', 'edge-glasses');
const { TaskForce } = require(path.join(base, 'task-force.js'));
const { LocalModelClient, OFFLINE } = require(path.join(base, 'local-model.js'));
const { createMockHub } = require(path.join(base, 'perception.js'));
const { reflect, buildReflexIndex } = require(path.join(base, 'reflection.js'));

async function asyncTest(name, fn) {
  try {
    await fn();
    console.log(`  ✓ ${name}`);
    return true;
  } catch (err) {
    console.log(`  ✗ ${name}`);
    console.log(`    Error: ${err.message}`);
    if (err.stack) console.log(`    ${err.stack.split('\n')[1] || ''}`);
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

const fixedNow = () => 42;
const GRANTS = ['capture.camera', 'capture.audio', 'share.external'];

function buildForce(reflexIndex) {
  const model = new LocalModelClient({ endpoint: OFFLINE });
  const hub = createMockHub({ now: fixedNow });
  return new TaskForce({ model, hub, now: fixedNow, reflexIndex });
}

async function runTests() {
  console.log('\n=== Testing edge-glasses/task-force.js ===\n');
  let passed = 0;
  let failed = 0;

  console.log('Construction:');

  if (test('throws without a model', () => {
    assert.throws(() => new TaskForce({ hub: {} }), /requires a local model/);
  })) passed++; else failed++;

  if (test('throws without a hub', () => {
    assert.throws(() => new TaskForce({ model: {} }), /requires a perception hub/);
  })) passed++; else failed++;

  console.log('\nPerceive -> plan -> act:');

  if (await asyncTest('a translate scene produces an allowed translate action', async () => {
    const force = buildForce();
    const tick = await force.tick({ camera: { caption: 'a french sign, please translate' } }, { attention: 'idle', grants: GRANTS });
    assert.ok(tick.allowed.some(d => d.action.type === 'translate.local'), 'translate allowed');
    assert.ok(tick.executed.some(e => e.action.type === 'translate.local' && e.result.ok), 'translate executed');
  })) passed++; else failed++;

  if (await asyncTest('perception is empty without consent and yields a standby plan', async () => {
    const force = buildForce();
    const tick = await force.tick({ camera: { caption: 'a french sign, please translate' } }, { attention: 'idle', grants: [] });
    assert.strictEqual(tick.observations.length, 0, 'no observations without consent');
    assert.ok(tick.skipped.some(s => s.modality === 'camera'));
  })) passed++; else failed++;

  console.log('\nGuardian integration:');

  if (await asyncTest('non-critical action defers while crossing', async () => {
    const force = buildForce();
    const tick = await force.tick({ camera: { caption: 'a french sign, please translate' } }, { attention: 'crossing', grants: GRANTS });
    assert.ok(tick.deferred.some(d => d.action.type === 'translate.local'), 'translate deferred');
    assert.strictEqual(tick.allowed.length, 0);
  })) passed++; else failed++;

  if (await asyncTest('hazard alert still fires while crossing', async () => {
    const force = buildForce();
    const tick = await force.tick({ camera: { caption: 'a car coming at the curb, watch out' } }, { attention: 'crossing', grants: GRANTS });
    assert.ok(tick.alerts.length >= 1, 'hazard surfaced');
    assert.ok(tick.allowed.some(d => d.action.type === 'hazard.alert'));
  })) passed++; else failed++;

  if (await asyncTest('sharing a phone number is redacted before execution', async () => {
    const force = buildForce();
    const tick = await force.tick({ audio: { transcript: 'text Sam my number 555-123-4567' } }, { attention: 'idle', grants: GRANTS });
    const share = tick.executed.find(e => e.action.type === 'share.message');
    assert.ok(share, 'share executed');
    assert.ok(!share.action.payload.text.includes('555-123-4567'), 'number redacted');
  })) passed++; else failed++;

  console.log('\nLatency + memory:');

  if (await asyncTest('tick records a latency report and episodic memory', async () => {
    const force = buildForce();
    const tick = await force.tick({ camera: { caption: 'a plain room' } }, { attention: 'idle', grants: GRANTS });
    assert.ok(tick.latency && typeof tick.latency.total === 'number');
    assert.strictEqual(force.memory.length, 1);
    assert.ok(force.memory[0].scene.startsWith('scene:'));
  })) passed++; else failed++;

  if (await asyncTest('memory is capped at memoryLimit', async () => {
    const model = new LocalModelClient({ endpoint: OFFLINE });
    const hub = createMockHub({ now: fixedNow });
    const force = new TaskForce({ model, hub, now: fixedNow, memoryLimit: 3 });
    for (let i = 0; i < 6; i++) {
      await force.tick({ camera: { caption: `scene ${i}` } }, { attention: 'idle', grants: GRANTS });
    }
    assert.strictEqual(force.memory.length, 3);
  })) passed++; else failed++;

  console.log('\nReflex short-circuit:');

  if (await asyncTest('a learned reflex skips the planner on a matching scene', async () => {
    const force = buildForce();
    const caption = 'a french sign, please translate';
    await force.tick({ camera: { caption } }, { attention: 'idle', grants: GRANTS });
    await force.tick({ camera: { caption } }, { attention: 'idle', grants: GRANTS });
    const learning = reflect(force.memory, { minEvidence: 2 });
    assert.ok(learning.reflexes.length >= 1, 'a reflex was learned');
    force.loadReflexes(buildReflexIndex(learning.reflexes));
    const tick = await force.tick({ camera: { caption } }, { attention: 'idle', grants: GRANTS });
    assert.strictEqual(tick.usedReflex, true, 'planner short-circuited');
    assert.ok(tick.latency.stages.every(s => s.stage !== 'plan'), 'plan stage skipped');
  })) passed++; else failed++;

  console.log(`\nResults: Passed: ${passed}, Failed: ${failed}`);
  process.exit(failed > 0 ? 1 : 0);
}

runTests();
