/**
 * Tests for scripts/submittal/extract-details.js
 *
 * Covers the pure helpers and the manifest scaffold. Raster-dependent paths
 * need PyMuPDF and a Chromium binary, which are not guaranteed in CI, so those
 * are exercised only when both are present and skipped cleanly otherwise.
 */

const assert = require('node:assert');
const { execFileSync } = require('node:child_process');
const { existsSync, mkdtempSync, readFileSync, rmSync } = require('node:fs');
const { tmpdir } = require('node:os');
const { join } = require('node:path');

const { escapeHtml, plateHtml, findChrome, cmdInit } = require('../../scripts/submittal/extract-details.js');

console.log('\n=== Testing submittal/extract-details.js ===\n');

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    console.log(`  ✓ ${name}`);
    passed++;
  } catch (error) {
    console.log(`  ✗ ${name}`);
    console.log(`    ${error.message}`);
    failed++;
  }
}

function hasPyMuPdf() {
  try {
    execFileSync('python3', ['-c', 'import fitz'], { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

// --- escapeHtml -----------------------------------------------------------

test('escapeHtml neutralizes markup characters', () => {
  assert.strictEqual(escapeHtml('<script>'), '&lt;script&gt;');
  assert.strictEqual(escapeHtml('a & b'), 'a &amp; b');
  assert.strictEqual(escapeHtml(`"q" 'r'`), '&quot;q&quot; &#39;r&#39;');
});

test('escapeHtml renders null and undefined as empty', () => {
  assert.strictEqual(escapeHtml(null), '');
  assert.strictEqual(escapeHtml(undefined), '');
});

test('escapeHtml coerces non-strings', () => {
  assert.strictEqual(escapeHtml(12), '12');
});

// --- plateHtml ------------------------------------------------------------

const tmp = mkdtempSync(join(tmpdir(), 'submittal-test-'));
// 1x1 transparent PNG — plateHtml only base64-encodes it, never decodes it.
const PNG = join(tmp, 'pix.png');
require('node:fs').writeFileSync(PNG, Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==', 'base64'));

const DETAIL = {
  title: 'Parapet coping',
  caption: 'Typical condition',
  sheet: 'A3.1',
  detail: '3',
  note: 'See Clarification B.'
};

test('plateHtml embeds the crop as a data URI', () => {
  const html = plateHtml(DETAIL, PNG, { name: 'Test Project' });
  assert.ok(html.includes('src="data:image/png;base64,'));
});

test('plateHtml renders every provenance field it is given', () => {
  const html = plateHtml(DETAIL, PNG, {
    name: 'Test Project',
    set: 'IFC Set',
    setDate: '5/26/2026',
    revision: 'Rev. 0',
    submittal: 'A03'
  });
  for (const value of ['A3.1', 'IFC Set', '5/26/2026', 'Rev. 0', 'Test Project', 'A03']) {
    assert.ok(html.includes(value), `missing provenance value: ${value}`);
  }
});

test('plateHtml omits title-block fields that have no value', () => {
  const html = plateHtml({ title: 'X' }, PNG, { name: 'P' });
  assert.ok(!html.includes('>Sheet<'), 'empty sheet field should not render');
  assert.ok(html.includes('>Project<'), 'populated field should render');
});

test('plateHtml warns when the source is uncontrolled', () => {
  const html = plateHtml(DETAIL, PNG, { name: 'P', uncontrolled: true });
  assert.ok(html.includes('UNCONTROLLED SOURCE'));
});

test('plateHtml stays silent when the source is controlled', () => {
  const html = plateHtml(DETAIL, PNG, { name: 'P', uncontrolled: false });
  assert.ok(!html.includes('UNCONTROLLED SOURCE'));
});

test('plateHtml escapes hostile manifest values', () => {
  const html = plateHtml({ title: '<img onerror=x>', sheet: 'A&1' }, PNG, { name: 'P' });
  assert.ok(!html.includes('<img onerror=x>'), 'title must be escaped');
  assert.ok(html.includes('A&amp;1'));
});

// --- findChrome -----------------------------------------------------------

test('findChrome reports every path it tried when none exist', () => {
  const saved = process.env.CHROME_BIN;
  process.env.CHROME_BIN = join(tmp, 'no-such-browser');
  try {
    // Only meaningful when the machine has no real Chromium either.
    const found = (() => {
      try {
        return findChrome();
      } catch (error) {
        assert.ok(/No Chromium found/.test(error.message));
        assert.ok(/CHROME_BIN/.test(error.message));
        return null;
      }
    })();
    if (found) assert.ok(existsSync(found), 'returned path must exist');
  } finally {
    if (saved === undefined) delete process.env.CHROME_BIN;
    else process.env.CHROME_BIN = saved;
  }
});

// --- cmdInit --------------------------------------------------------------

test('cmdInit writes a parseable manifest', () => {
  const out = join(tmp, 'details.json');
  cmdInit(out);
  const manifest = JSON.parse(readFileSync(out, 'utf8'));
  assert.ok(Array.isArray(manifest.details));
  assert.ok(manifest.details.length > 0);
  assert.ok(manifest.project.name);
});

test('cmdInit defaults the scaffold to uncontrolled', () => {
  const out = join(tmp, 'details2.json');
  cmdInit(out);
  const manifest = JSON.parse(readFileSync(out, 'utf8'));
  assert.strictEqual(manifest.project.uncontrolled, true, 'scaffold must default to uncontrolled so unverified sets cannot ship silently');
});

test('cmdInit scaffold rect has four components', () => {
  const out = join(tmp, 'details3.json');
  cmdInit(out);
  const manifest = JSON.parse(readFileSync(out, 'utf8'));
  assert.strictEqual(manifest.details[0].rect.split(',').length, 4);
});

// --- raster.py (skipped without PyMuPDF) ----------------------------------

if (hasPyMuPdf()) {
  const RASTER = join(__dirname, '..', '..', 'scripts', 'submittal', 'raster.py');

  test('raster.py list emits JSON with a page inventory', () => {
    const pdf = join(tmp, 'sample.pdf');
    execFileSync('python3', ['-c', `import fitz; d=fitz.open(); p=d.new_page(); p.insert_text((72,72),"SHEET A3.1"); d.save(${JSON.stringify(pdf)})`]);
    const out = execFileSync('python3', [RASTER, 'list', pdf], { encoding: 'utf8' });
    const parsed = JSON.parse(out.slice(out.search(/[{[]/)));
    assert.strictEqual(parsed.pages, 1);
    assert.strictEqual(parsed.sheets.length, 1);
  });

  test('raster.py crop rejects a rect outside the page', () => {
    const pdf = join(tmp, 'sample.pdf');
    assert.throws(() => execFileSync('python3', [RASTER, 'crop', pdf, '1', '9000,9000,9500,9500', '72', join(tmp, 'x.png')], { stdio: 'pipe' }));
  });
} else {
  console.log('  - raster.py tests skipped (PyMuPDF not installed)');
}

rmSync(tmp, { recursive: true, force: true });

console.log(`\nResults: Passed: ${passed}, Failed: ${failed}\n`);
if (failed > 0) process.exitCode = 1;
