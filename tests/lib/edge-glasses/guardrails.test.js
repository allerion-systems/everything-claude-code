/**
 * Tests for scripts/lib/edge-glasses/guardrails.js
 *
 * Run with: node tests/lib/edge-glasses/guardrails.test.js
 */

const assert = require('assert');
const path = require('path');

const { VERDICT, redactPii, hasConsent, evaluateAction, screenPlan } = require(path.join(__dirname, '..', '..', '..', 'scripts', 'lib', 'edge-glasses', 'guardrails.js'));

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
  console.log('\n=== Testing edge-glasses/guardrails.js ===\n');
  let passed = 0;
  let failed = 0;

  console.log('PII redaction:');

  if (test('redactPii removes emails and phones', () => {
    const { clean, redactions } = redactPii('mail me at a.b@x.io or call 555-123-4567');
    assert.ok(!clean.includes('a.b@x.io'), 'email removed');
    assert.ok(!clean.includes('555-123-4567'), 'phone removed');
    assert.ok(redactions.some(r => r.label === 'email'), 'email flagged');
    assert.ok(redactions.some(r => r.label === 'phone'), 'phone flagged');
  })) passed++; else failed++;

  if (test('redactPii keeps SSN classified as ssn not card', () => {
    const { redactions } = redactPii('ssn 123-45-6789');
    assert.ok(redactions.some(r => r.label === 'ssn'), 'ssn flagged');
    assert.ok(!redactions.some(r => r.label === 'card'), 'not double-counted as card');
  })) passed++; else failed++;

  if (test('redactPii is a no-op on clean text', () => {
    const { clean, redactions } = redactPii('the weather is nice');
    assert.strictEqual(clean, 'the weather is nice');
    assert.strictEqual(redactions.length, 0);
  })) passed++; else failed++;

  console.log('\nConsent:');

  if (test('hasConsent works for array, set, and object grants', () => {
    assert.strictEqual(hasConsent('capture.audio', ['capture.audio']), true);
    assert.strictEqual(hasConsent('capture.audio', new Set(['capture.audio'])), true);
    assert.strictEqual(hasConsent('capture.audio', { 'capture.audio': true }), true);
    assert.strictEqual(hasConsent('capture.audio', { 'capture.audio': false }), false);
    assert.strictEqual(hasConsent('capture.audio', []), false);
  })) passed++; else failed++;

  console.log('\nAction evaluation:');

  if (test('capture without consent is blocked', () => {
    const d = evaluateAction({ type: 'capture.photo' }, { grants: [] });
    assert.strictEqual(d.verdict, VERDICT.BLOCK);
    assert.strictEqual(d.severity, 'high');
  })) passed++; else failed++;

  if (test('capture with consent is not blocked for consent reason', () => {
    const d = evaluateAction({ type: 'capture.photo' }, { grants: ['capture.camera'] });
    assert.notStrictEqual(d.verdict, VERDICT.BLOCK);
  })) passed++; else failed++;

  if (test('covert capture is always blocked', () => {
    const d = evaluateAction({ type: 'capture.audio', covert: true }, { grants: ['capture.audio'] });
    assert.strictEqual(d.verdict, VERDICT.BLOCK);
  })) passed++; else failed++;

  if (test('non-critical action defers during committed attention', () => {
    const d = evaluateAction({ type: 'translate.local' }, { attention: 'crossing' });
    assert.strictEqual(d.verdict, VERDICT.DEFER);
  })) passed++; else failed++;

  if (test('hazard alert is critical and not deferred while crossing', () => {
    const d = evaluateAction({ type: 'hazard.alert', payload: { text: 'stop' } }, { attention: 'crossing' });
    assert.strictEqual(d.verdict, VERDICT.ALLOW);
  })) passed++; else failed++;

  if (test('sharing text with PII is redacted, not blocked', () => {
    const d = evaluateAction({ type: 'share.message', payload: { text: 'call 555-123-4567' } }, { grants: ['share.external'] });
    assert.strictEqual(d.verdict, VERDICT.REDACT);
    assert.ok(!d.action.payload.text.includes('555-123-4567'), 'payload sanitized');
    assert.ok(Array.isArray(d.action.redactions) && d.action.redactions.length === 1);
  })) passed++; else failed++;

  if (test('sharing without consent is blocked before redaction', () => {
    const d = evaluateAction({ type: 'share.message', payload: { text: 'hi' } }, { grants: [] });
    assert.strictEqual(d.verdict, VERDICT.BLOCK);
  })) passed++; else failed++;

  if (test('safe local action is allowed', () => {
    const d = evaluateAction({ type: 'navigate.hint' }, {});
    assert.strictEqual(d.verdict, VERDICT.ALLOW);
  })) passed++; else failed++;

  if (test('unknown action type requires confirmation', () => {
    const d = evaluateAction({ type: 'launch.drone' }, {});
    assert.strictEqual(d.verdict, VERDICT.CONFIRM);
  })) passed++; else failed++;

  if (test('action with no type is blocked', () => {
    const d = evaluateAction({}, {});
    assert.strictEqual(d.verdict, VERDICT.BLOCK);
  })) passed++; else failed++;

  console.log('\nPlan screening:');

  if (test('screenPlan buckets actions by verdict', () => {
    const actions = [
      { type: 'navigate.hint' }, // allow
      { type: 'capture.photo' }, // block (no consent)
      { type: 'launch.drone' } // confirm
    ];
    const { allowed, blocked, needsConfirm } = screenPlan(actions, { grants: [] });
    assert.strictEqual(allowed.length, 1);
    assert.strictEqual(blocked.length, 1);
    assert.strictEqual(needsConfirm.length, 1);
  })) passed++; else failed++;

  console.log(`\nResults: Passed: ${passed}, Failed: ${failed}`);
  process.exit(failed > 0 ? 1 : 0);
}

runTests();
