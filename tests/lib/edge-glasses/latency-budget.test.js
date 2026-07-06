/**
 * Tests for scripts/lib/edge-glasses/latency-budget.js
 *
 * Run with: node tests/lib/edge-glasses/latency-budget.test.js
 */

const assert = require('assert');
const path = require('path');

const { DEFAULT_STAGE_BUDGETS, totalBudget, LatencyLedger } = require(path.join(__dirname, '..', '..', '..', 'scripts', 'lib', 'edge-glasses', 'latency-budget.js'));

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

// A controllable clock: each call returns the next queued timestamp.
function scriptedClock(timestamps) {
  let i = 0;
  return () => timestamps[Math.min(i++, timestamps.length - 1)];
}

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

async function runTests() {
  console.log('\n=== Testing edge-glasses/latency-budget.js ===\n');
  let passed = 0;
  let failed = 0;

  if (test('totalBudget sums the stage budgets', () => {
    assert.strictEqual(totalBudget({ a: 100, b: 50 }), 150);
    assert.strictEqual(totalBudget(DEFAULT_STAGE_BUDGETS), 1200);
  })) passed++; else failed++;

  if (test('start/stop records duration against budget', () => {
    const clock = scriptedClock([0, 120]);
    const ledger = new LatencyLedger({ plan: 500 }, clock);
    ledger.start('plan');
    const entry = ledger.stop();
    assert.strictEqual(entry.ms, 120);
    assert.strictEqual(entry.budget, 500);
    assert.strictEqual(entry.overBudget, false);
  })) passed++; else failed++;

  if (test('flags a stage that exceeds its budget', () => {
    const clock = scriptedClock([0, 700]);
    const ledger = new LatencyLedger({ plan: 500 }, clock);
    ledger.start('plan');
    const entry = ledger.stop();
    assert.strictEqual(entry.overBudget, true);
  })) passed++; else failed++;

  if (test('report aggregates total and within-budget status', () => {
    const clock = scriptedClock([0, 100, 100, 200]);
    const ledger = new LatencyLedger({ perceive: 250, plan: 500 }, clock);
    ledger.start('perceive');
    ledger.stop();
    ledger.start('plan');
    ledger.stop();
    const report = ledger.report();
    assert.strictEqual(report.total, 200);
    assert.strictEqual(report.withinBudget, true);
    assert.strictEqual(report.stages.length, 2);
  })) passed++; else failed++;

  if (test('worstStage picks the biggest overshoot', () => {
    const clock = scriptedClock([0, 300, 300, 320]);
    const ledger = new LatencyLedger({ perceive: 250, plan: 500 }, clock);
    ledger.start('perceive'); // 300ms vs 250 budget -> +50 overshoot
    ledger.stop();
    ledger.start('plan'); // 20ms vs 500 -> under
    ledger.stop();
    assert.strictEqual(ledger.worstStage().stage, 'perceive');
  })) passed++; else failed++;

  if (test('hasHeadroom is false once budget is consumed', () => {
    const clock = scriptedClock([0, 1200]);
    const ledger = new LatencyLedger(DEFAULT_STAGE_BUDGETS, clock);
    ledger.start('plan');
    ledger.stop();
    assert.strictEqual(ledger.hasHeadroom('render'), false);
  })) passed++; else failed++;

  if (await asyncTest('measure times an async function', async () => {
    const clock = scriptedClock([0, 40]);
    const ledger = new LatencyLedger({ act: 300 }, clock);
    const result = await ledger.measure('act', async () => 'done');
    assert.strictEqual(result, 'done');
    assert.strictEqual(ledger.entries[0].stage, 'act');
    assert.strictEqual(ledger.entries[0].ms, 40);
  })) passed++; else failed++;

  console.log(`\nResults: Passed: ${passed}, Failed: ${failed}`);
  process.exit(failed > 0 ? 1 : 0);
}

runTests();
