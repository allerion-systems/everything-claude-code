/**
 * Tests for scripts/lib/edge-glasses/reflection.js
 *
 * Run with: node tests/lib/edge-glasses/reflection.test.js
 */

const assert = require('assert');
const path = require('path');

const { sceneSignature, reflect, buildReflexIndex } = require(path.join(__dirname, '..', '..', '..', 'scripts', 'lib', 'edge-glasses', 'reflection.js'));

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
  console.log('\n=== Testing edge-glasses/reflection.js ===\n');
  let passed = 0;
  let failed = 0;

  console.log('Scene signature:');

  if (test('sceneSignature is order-independent and drops short words', () => {
    const a = sceneSignature('a French street sign menu translate');
    const b = sceneSignature('menu sign, translate French street, a');
    assert.strictEqual(a, b);
    assert.ok(!a.split('|').includes('a'), 'short words dropped');
  })) passed++; else failed++;

  console.log('\nReflex mining:');

  if (test('a repeated scene->action becomes a reflex', () => {
    const traces = [
      { scene: 'french menu sign translate', allowed: [{ action: { type: 'translate.local', target: 'scene-text' } }], blocked: [], deferred: [] },
      { scene: 'translate french menu sign', allowed: [{ action: { type: 'translate.local', target: 'scene-text' } }], blocked: [], deferred: [] }
    ];
    const { reflexes } = reflect(traces, { minEvidence: 2 });
    assert.strictEqual(reflexes.length, 1);
    assert.strictEqual(reflexes[0].action.type, 'translate.local');
    assert.strictEqual(reflexes[0].evidenceCount, 2);
    assert.ok(reflexes[0].confidence > 0);
  })) passed++; else failed++;

  if (test('a one-off scene does not become a reflex', () => {
    const traces = [{ scene: 'unique random scene here', allowed: [{ action: { type: 'hud.notice' } }], blocked: [], deferred: [] }];
    const { reflexes } = reflect(traces, { minEvidence: 2 });
    assert.strictEqual(reflexes.length, 0);
  })) passed++; else failed++;

  console.log('\nPolicy hints:');

  if (test('repeated consent blocks yield a grant suggestion', () => {
    const blocked = [{ action: { type: 'capture.photo' }, reasons: ['capture.photo requires consent "capture.camera" which is not granted'] }];
    const traces = [
      { scene: 's1', allowed: [], blocked, deferred: [] },
      { scene: 's2', allowed: [], blocked, deferred: [] }
    ];
    const { policyHints } = reflect(traces, { minEvidence: 2 });
    assert.strictEqual(policyHints.length, 1);
    assert.strictEqual(policyHints[0].occurrences, 2);
    assert.ok(/grant "capture.camera"/.test(policyHints[0].suggestion));
  })) passed++; else failed++;

  if (test('repeated attention defers yield a replay suggestion', () => {
    const deferred = [{ action: { type: 'translate.local' }, reasons: ['attention is "crossing"; deferring non-critical action'] }];
    const traces = [
      { scene: 's1', allowed: [], blocked: [], deferred },
      { scene: 's2', allowed: [], blocked: [], deferred }
    ];
    const { policyHints } = reflect(traces, { minEvidence: 2 });
    assert.ok(/replay when attention returns/.test(policyHints[0].suggestion));
  })) passed++; else failed++;

  console.log('\nReflex index:');

  if (test('buildReflexIndex maps trigger to reflex', () => {
    const index = buildReflexIndex([{ trigger: 'a|b|c', action: { type: 'navigate.hint' } }]);
    assert.strictEqual(index.get('a|b|c').action.type, 'navigate.hint');
    assert.strictEqual(index.has('nope'), false);
  })) passed++; else failed++;

  console.log(`\nResults: Passed: ${passed}, Failed: ${failed}`);
  process.exit(failed > 0 ? 1 : 0);
}

runTests();
