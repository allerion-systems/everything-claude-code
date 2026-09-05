/**
 * Tests for scripts/govcon/lib.js
 *
 * Run with: node tests/govcon/lib.test.js
 */

const assert = require('assert');
const lib = require('../../scripts/govcon/lib');

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
  console.log('\n=== Testing govcon/lib.js ===\n');
  let passed = 0;
  let failed = 0;
  const t = (name, fn) => (test(name, fn) ? passed++ : failed++);

  const now = new Date('2026-09-05T00:00:00Z');

  t('buildSearchUrl encodes keyword and pins active filter', () => {
    const url = lib.buildSearchUrl('safety gloves');
    assert.ok(url.includes('q=safety+gloves'));
    assert.ok(url.includes('is_active=true'));
    assert.ok(url.startsWith('https://sam.gov/api/prod/sgs/v1/search/?'));
  });

  t('isBiddableType respects allowed list', () => {
    assert.strictEqual(lib.isBiddableType('o', ['o', 'k']), true);
    assert.strictEqual(lib.isBiddableType('r', ['o', 'k']), false);
  });

  t('withinWindow accepts inside, rejects outside and garbage', () => {
    assert.strictEqual(lib.withinWindow('2026-09-15T00:00:00Z', now, 3, 60), true);
    assert.strictEqual(lib.withinWindow('2026-09-06T00:00:00Z', now, 3, 60), false);
    assert.strictEqual(lib.withinWindow('2026-12-31T00:00:00Z', now, 3, 60), false);
    assert.strictEqual(lib.withinWindow(null, now, 3, 60), false);
    assert.strictEqual(lib.withinWindow('not-a-date', now, 3, 60), false);
  });

  t('eligibleSetAside treats null/empty as NONE', () => {
    assert.strictEqual(lib.eligibleSetAside(null, ['NONE', 'SBA']), true);
    assert.strictEqual(lib.eligibleSetAside('', ['NONE', 'SBA']), true);
    assert.strictEqual(lib.eligibleSetAside('SBA', ['NONE', 'SBA']), true);
    assert.strictEqual(lib.eligibleSetAside('SDVOSBC', ['NONE', 'SBA']), false);
  });

  t('laneForTitle matches on any keyword token', () => {
    const lanes = { tech: ['laptop', 'network switch'], mat: ['lumber'] };
    assert.strictEqual(lib.laneForTitle('BIOMED LAPTOPS', lanes), 'tech');
    assert.strictEqual(lib.laneForTitle('Douglas Fir LUMBER supply', lanes), 'mat');
    assert.strictEqual(lib.laneForTitle('Janitorial services', lanes), null);
  });

  t('digestRow escapes pipes and truncates title', () => {
    const row = lib.digestRow({
      id: 'abc',
      solicitationNumber: 'X-1',
      title: 'A|B'.padEnd(100, 'z'),
      setAside: 'SBA',
      responseDate: '2026-09-15T00:00:00Z',
    });
    assert.ok(row.includes('A/B'));
    assert.ok(row.includes('| SBA |'));
    assert.ok(row.includes('2026-09-15'));
    assert.ok(row.includes('https://sam.gov/opp/abc/view'));
  });

  t('digestPath avoids clobbering existing digests', () => {
    const existing = new Set(['/d/2026-09-05.md', '/d/2026-09-05-run2.md']);
    const p = lib.digestPath('/d', '2026-09-05', (f) => existing.has(f));
    assert.strictEqual(p, '/d/2026-09-05-run3.md');
    const fresh = lib.digestPath('/d', '2026-09-06', () => false);
    assert.strictEqual(fresh, '/d/2026-09-06.md');
  });

  console.log(`\n${passed} passed, ${failed} failed\n`);
  process.exit(failed > 0 ? 1 : 0);
}

runTests();
