/**
 * Tests for scripts/lib/edge-glasses/hud.js
 *
 * Run with: node tests/lib/edge-glasses/hud.test.js
 */

const assert = require('assert');
const path = require('path');

const { renderHud, renderVoice, verbForAction } = require(path.join(__dirname, '..', '..', '..', 'scripts', 'lib', 'edge-glasses', 'hud.js'));

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
  console.log('\n=== Testing edge-glasses/hud.js ===\n');
  let passed = 0;
  let failed = 0;

  if (test('renderHud enforces the line budget', () => {
    const allowed = Array.from({ length: 10 }, () => ({ action: { type: 'navigate.hint', payload: { hint: 'go' } } }));
    const lines = renderHud({ allowed }, { maxLines: 3 });
    assert.ok(lines.length <= 3, `expected <= 3 lines, got ${lines.length}`);
  })) passed++; else failed++;

  if (test('renderHud enforces the column width', () => {
    const allowed = [{ action: { type: 'remember.note', payload: { text: 'x'.repeat(200) } } }];
    const lines = renderHud({ allowed }, { width: 20 });
    assert.ok(lines[0].length <= 20, `expected <= 20 chars, got ${lines[0].length}`);
    assert.ok(lines[0].endsWith('…'));
  })) passed++; else failed++;

  if (test('alerts are rendered first with a warning glyph', () => {
    const tick = { alerts: [{ type: 'hazard.alert', payload: { text: 'stop' } }], allowed: [] };
    const lines = renderHud(tick);
    assert.ok(lines[0].startsWith('⚠'));
    assert.ok(lines[0].includes('stop'));
  })) passed++; else failed++;

  if (test('hazard.alert is not double-rendered from allowed', () => {
    const tick = {
      alerts: [{ type: 'hazard.alert', payload: { text: 'stop' } }],
      allowed: [{ action: { type: 'hazard.alert', payload: { text: 'stop' } } }]
    };
    const lines = renderHud(tick);
    const stopLines = lines.filter(l => l.includes('stop'));
    assert.strictEqual(stopLines.length, 1);
  })) passed++; else failed++;

  if (test('renderHud shows a placeholder when there is nothing to show', () => {
    const lines = renderHud({ allowed: [] });
    assert.strictEqual(lines.length, 1);
  })) passed++; else failed++;

  if (test('renderHud notes the count of blocked actions', () => {
    const tick = { allowed: [{ action: { type: 'navigate.hint', payload: { hint: 'go' } } }], blocked: [{ action: { type: 'capture.photo' } }] };
    const lines = renderHud(tick);
    assert.ok(lines.some(l => l.includes('1 blocked')));
  })) passed++; else failed++;

  console.log('\nVoice channel:');

  if (test('renderVoice prioritizes the top alert', () => {
    const tick = { alerts: [{ payload: { text: 'careful' } }], allowed: [{ action: { type: 'navigate.hint', payload: { hint: 'left' } } }] };
    assert.strictEqual(renderVoice(tick), 'careful');
  })) passed++; else failed++;

  if (test('renderVoice speaks navigation when no alert', () => {
    const tick = { allowed: [{ action: { type: 'navigate.hint', payload: { hint: 'turn left' } } }] };
    assert.ok(renderVoice(tick).includes('turn left'));
  })) passed++; else failed++;

  if (test('renderVoice is silent when nothing warrants speech', () => {
    const tick = { allowed: [{ action: { type: 'remember.note', payload: { text: 'x' } } }] };
    assert.strictEqual(renderVoice(tick), '');
  })) passed++; else failed++;

  if (test('verbForAction formats a translate action', () => {
    const label = verbForAction({ type: 'translate.local', payload: { to: 'en' } });
    assert.ok(label.startsWith('Translate'));
  })) passed++; else failed++;

  console.log(`\nResults: Passed: ${passed}, Failed: ${failed}`);
  process.exit(failed > 0 ? 1 : 0);
}

runTests();
