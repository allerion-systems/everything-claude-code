/**
 * Tests for scripts/lib/edge-glasses/perception.js
 *
 * Run with: node tests/lib/edge-glasses/perception.test.js
 */

const assert = require('assert');
const path = require('path');

const { SensorHub, summarizeScene, createMockHub } = require(path.join(__dirname, '..', '..', '..', 'scripts', 'lib', 'edge-glasses', 'perception.js'));

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

const fixedNow = () => 1000;

function runTests() {
  console.log('\n=== Testing edge-glasses/perception.js ===\n');
  let passed = 0;
  let failed = 0;

  console.log('Consent gating:');

  if (test('camera is skipped without capture.camera consent', () => {
    const hub = createMockHub({ grants: [], now: fixedNow });
    const { observations, skipped } = hub.perceive({ camera: { caption: 'a cat' } });
    assert.strictEqual(observations.length, 0, 'no observations without consent');
    assert.ok(skipped.some(s => s.modality === 'camera'), 'camera reported as skipped');
  })) passed++; else failed++;

  if (test('camera produces an observation with consent', () => {
    const hub = createMockHub({ grants: ['capture.camera'], now: fixedNow });
    const { observations } = hub.perceive({ camera: { caption: 'a cat' } });
    assert.strictEqual(observations.length, 1);
    assert.strictEqual(observations[0].modality, 'camera');
    assert.strictEqual(observations[0].text, 'a cat');
    assert.strictEqual(observations[0].ts, 1000);
  })) passed++; else failed++;

  console.log('\nMulti-modal:');

  if (test('observations are sorted by confidence descending', () => {
    const hub = createMockHub({ grants: ['capture.camera', 'capture.audio'], now: fixedNow });
    const { observations } = hub.perceive({
      camera: { caption: 'low conf scene', confidence: 0.4 },
      audio: { transcript: 'high conf speech', confidence: 0.9 }
    });
    assert.strictEqual(observations[0].text, 'high conf speech');
    assert.ok(observations[0].confidence >= observations[1].confidence);
  })) passed++; else failed++;

  if (test('ocr provider can emit multiple lines', () => {
    const hub = createMockHub({ grants: ['capture.camera'], now: fixedNow });
    const { observations } = hub.perceive({ ocr: { text: ['line one', 'line two'] } });
    const ocr = observations.filter(o => o.modality === 'ocr');
    assert.strictEqual(ocr.length, 2);
  })) passed++; else failed++;

  console.log('\nRobustness:');

  if (test('a throwing provider is skipped, not fatal', () => {
    const hub = new SensorHub({ grants: ['x'], now: fixedNow });
    hub.register('camera', () => {
      throw new Error('sensor fault');
    });
    // camera requires capture.camera which is not granted -> skipped for consent
    const withConsent = new SensorHub({ grants: ['capture.camera'], now: fixedNow });
    withConsent.register('camera', () => {
      throw new Error('sensor fault');
    });
    const { observations, skipped } = withConsent.perceive({ camera: {} });
    assert.strictEqual(observations.length, 0);
    assert.ok(skipped.some(s => /provider error/.test(s.reason)));
  })) passed++; else failed++;

  if (test('empty text observations are dropped', () => {
    const hub = new SensorHub({ grants: ['capture.camera'], now: fixedNow });
    hub.register('camera', () => ({ text: '   ' }));
    const { observations } = hub.perceive({ camera: {} });
    assert.strictEqual(observations.length, 0);
  })) passed++; else failed++;

  console.log('\nScene summary:');

  if (test('summarizeScene renders a compact scene string', () => {
    const scene = summarizeScene([{ modality: 'camera', text: 'a sign', confidence: 0.7 }]);
    assert.ok(scene.startsWith('scene: '));
    assert.ok(scene.includes('camera:a sign'));
  })) passed++; else failed++;

  if (test('summarizeScene handles empty observations', () => {
    assert.strictEqual(summarizeScene([]), 'scene: (nothing salient)');
  })) passed++; else failed++;

  if (test('summarizeScene truncates to the char budget', () => {
    const obs = Array.from({ length: 20 }, (_, i) => ({ modality: 'ocr', text: `line-${i}-xxxxx`, confidence: 0.5 }));
    const scene = summarizeScene(obs, { maxChars: 60 });
    assert.ok(scene.length <= 60, `expected <= 60, got ${scene.length}`);
    assert.ok(scene.endsWith('…'));
  })) passed++; else failed++;

  console.log(`\nResults: Passed: ${passed}, Failed: ${failed}`);
  process.exit(failed > 0 ? 1 : 0);
}

runTests();
