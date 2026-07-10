/**
 * Tests for the HOVER estimating pipeline: scripts/hover/estimate.js
 *
 * Run with: node tests/hover/estimate.test.js
 */

const assert = require('assert');
const path = require('path');
const fs = require('fs');

const pm = require('../../scripts/hover/plan-model');
const est = require('../../scripts/hover/estimate');

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

function freshModel(mutate) {
  const clone = JSON.parse(JSON.stringify(fixture));
  if (mutate) mutate(clone);
  return pm.normalize(clone);
}

function runTests() {
  console.log('\n=== Testing HOVER estimating pipeline ===\n');

  let passed = 0;
  let failed = 0;
  const t = (name, fn) => { if (test(name, fn)) passed++; else failed++; };

  console.log('Pitch and slope math:');

  t('parsePitch reads n/12 and n:12, rejects garbage', () => {
    assert.strictEqual(est.parsePitch('6/12'), 6);
    assert.strictEqual(est.parsePitch('8:12'), 8);
    assert.strictEqual(est.parsePitch('flat'), null);
    assert.strictEqual(est.parsePitch(''), null);
  });

  t('slopeFactor: 6/12 -> 1.118, unknown pitch -> 1', () => {
    assert.ok(Math.abs(est.slopeFactor('6/12') - Math.hypot(1, 0.5)) < 1e-9);
    assert.strictEqual(est.slopeFactor(''), 1);
  });

  console.log('\nQuantity takeoff (gable fixture):');

  const model = freshModel();
  const takeoff = est.computeTakeoff(model);

  t('roof plan/slope areas and squares', () => {
    // two 40x14 planes @ 6/12: plan 1120 SF, slope 1120 * 1.118034
    assert.ok(Math.abs(takeoff.roof.planArea - 1120) < 1e-6);
    assert.ok(Math.abs(takeoff.roof.slopeArea - 1120 * Math.hypot(1, 0.5)) < 1e-6);
    assert.ok(Math.abs(takeoff.roof.squares - takeoff.roof.slopeArea / 100) < 1e-9);
  });

  t('edge lengths classified by type', () => {
    assert.strictEqual(takeoff.roof.edges.ridge, 40);
    assert.strictEqual(takeoff.roof.edges.eave, 80);
    assert.strictEqual(takeoff.roof.edges.rake, 56);
    assert.strictEqual(takeoff.roof.edges.hip, 0);
    assert.strictEqual(takeoff.roof.edges.valley, 0);
  });

  t('rafter count matches the S-2 layout and lengths are slope-corrected', () => {
    // 40' eave @ 16" o.c. => 29 bays per plane, 2 planes
    assert.ok(takeoff.rafters.count >= 40 && takeoff.rafters.count <= 80,
      `count=${takeoff.rafters.count}`);
    assert.ok(Math.abs(takeoff.rafters.slopeLf - takeoff.rafters.planLf * Math.hypot(1, 0.5)) < 1e-6);
  });

  t('wall areas net of openings, studs and plates counted', () => {
    const w = takeoff.walls;
    assert.strictEqual(w.grossArea, 136 * 8);
    // openings: door 3x6.67 + two windows 4x4 + one window 3x4
    assert.ok(Math.abs(w.openingArea - (3 * 6.67 + 2 * 16 + 12)) < 1e-6);
    assert.ok(Math.abs(w.netArea - (w.grossArea - w.openingArea)) < 1e-9);
    assert.strictEqual(w.plateLf, 136 * 3);
    assert.strictEqual(w.openings.length, 4);
    // layout studs + 4 per opening
    assert.ok(w.studCount > 100 && w.studCount < 150, `studCount=${w.studCount}`);
  });

  t('no deck in fixture -> deck takeoff is null', () => {
    assert.strictEqual(takeoff.deck, null);
  });

  t('deck takeoff mirrors the S-4 layout when a deck is present', () => {
    const withDeck = freshModel(m => {
      m.deck = { attachedTo: 'F3', origin: [10, 28], direction: [0, 1], width: 14, depth: 10, height: 3, estimated: true };
    });
    const deck = est.computeTakeoff(withDeck).deck;
    assert.strictEqual(deck.area, 140);
    assert.strictEqual(deck.joistCount, 10); // 14' @ 16" o.c., interior lines
    assert.strictEqual(deck.postCount, 3);   // width > 12
    assert.strictEqual(deck.guardrailLf, 14 + 2 * 10);
    assert.ok(deck.estimated);
  });

  console.log('\nPricing:');

  const estimate = est.buildEstimate(takeoff, null, {});

  t('placeholder prices are flagged on every line and counted', () => {
    assert.ok(estimate.lines.length > 0);
    assert.ok(estimate.lines.every(l => l.priceSource === 'PLACEHOLDER'));
    assert.strictEqual(estimate.placeholderCount, estimate.lines.length);
    assert.ok(/PRELIMINARY ESTIMATE/.test(estimate.disclaimer));
    assert.ok(/PLACEHOLDER/.test(estimate.disclaimer));
  });

  t('zero-quantity lines are skipped (no hips/valleys/deck in fixture)', () => {
    assert.ok(!estimate.lines.some(l => /Ice & water/.test(l.item)));
    assert.ok(!estimate.lines.some(l => l.section === 'DECK'));
    assert.ok(!estimate.lines.some(l => /Hip\/valley/.test(l.item)));
  });

  t('waste factors and totals math', () => {
    const shingles = estimate.lines.find(l => l.item === 'Shingles');
    assert.strictEqual(shingles.wastePct, 10);
    assert.ok(Math.abs(shingles.grossQty - shingles.qty * 1.1) < 0.02);
    const sum = estimate.lines.reduce((s, l) => s + l.total, 0);
    const t2 = estimate.totals;
    assert.ok(Math.abs(t2.subtotal - sum) < 0.05);
    assert.ok(Math.abs(t2.total - (t2.subtotal + t2.markup + t2.tax)) < 0.01);
  });

  t('user price book overrides placeholders and marks source PRICEBOOK', () => {
    const book = { currency: 'USD', items: { shingles: { unit: 'SQ', material: 200, labor: 100 } } };
    const priced = est.buildEstimate(takeoff, book, {});
    const shingles = priced.lines.find(l => l.item === 'Shingles');
    assert.strictEqual(shingles.priceSource, 'PRICEBOOK');
    assert.strictEqual(shingles.materialUnit, 200);
    assert.strictEqual(priced.placeholderCount, priced.lines.length - 1);
  });

  t('markup and tax options are applied (tax on materials only)', () => {
    const priced = est.buildEstimate(takeoff, null, { markupPct: 15, taxPct: 8 });
    const t2 = priced.totals;
    assert.ok(Math.abs(t2.markup - t2.subtotal * 0.15) < 0.01);
    assert.ok(Math.abs(t2.tax - t2.materialSubtotal * 0.08) < 0.01);
  });

  t('sections filter limits the estimate scope', () => {
    const roofingOnly = est.buildEstimate(takeoff, null, { sections: ['roofing'] });
    assert.ok(roofingOnly.lines.length > 0);
    assert.ok(roofingOnly.lines.every(l => l.section === 'ROOFING'));
  });

  console.log('\nRenderers:');

  t('CSV has a header, one row per line item, and a TOTAL row', () => {
    const csv = est.toCsv(estimate);
    const rows = csv.trim().split('\n');
    assert.ok(rows[0].startsWith('section,item,qty'));
    assert.ok(rows.some(r => r.includes('Shingles')));
    assert.ok(rows[rows.length - 1].includes('TOTAL'));
  });

  t('markdown summary carries quantities, totals, and the disclaimer', () => {
    const md = est.toMarkdown(model, takeoff, estimate);
    assert.ok(md.includes('# Preliminary Estimate'));
    assert.ok(md.includes('SAMPLE RESIDENCE'));
    assert.ok(md.includes('squares'));
    assert.ok(md.includes('PRELIMINARY ESTIMATE - NOT A BID'));
    assert.ok(md.includes('| ROOFING |'));
  });

  console.log(`\nPassed: ${passed}`);
  console.log(`Failed: ${failed}`);
  process.exit(failed > 0 ? 1 : 0);
}

runTests();
