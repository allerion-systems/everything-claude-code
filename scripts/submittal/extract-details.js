#!/usr/bin/env node
/**
 * Submittal detail plates — crop details out of controlled drawing sheets and
 * emit labeled plates for a submittal binder.
 *
 * Every plate carries its provenance (sheet number, revision, set name, date)
 * in a title block, so a reviewer can trace any image back to the sheet it
 * came from. That traceability is the point: an unlabeled crop in a submittal
 * is indistinguishable from a crop off a superseded set.
 *
 * Usage
 *   node scripts/submittal/extract-details.js sheets <drawings.pdf>
 *   node scripts/submittal/extract-details.js text <drawings.pdf> <page>
 *   node scripts/submittal/extract-details.js plates <manifest.json> --out <dir>
 *   node scripts/submittal/extract-details.js init <manifest.json>
 *
 * Requires: Python 3 with PyMuPDF (pip install pymupdf) and a Chromium binary.
 * Set CHROME_BIN to override Chromium autodetection.
 */

const { execFileSync } = require('node:child_process');
const { existsSync, mkdirSync, readFileSync, writeFileSync } = require('node:fs');
const { dirname, join, resolve } = require('node:path');

const RASTER = join(__dirname, 'raster.py');

const CHROME_CANDIDATES = [
  process.env.CHROME_BIN,
  '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
  '/usr/bin/chromium',
  '/usr/bin/chromium-browser',
  '/usr/bin/google-chrome',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
].filter(Boolean);

function findChrome() {
  const hit = CHROME_CANDIDATES.find(p => existsSync(p));
  if (!hit) {
    throw new Error(`No Chromium found. Tried:\n  ${CHROME_CANDIDATES.join('\n  ')}\nSet CHROME_BIN to your browser binary.`);
  }
  return hit;
}

function raster(args) {
  const out = execFileSync('python3', [RASTER, ...args], {
    encoding: 'utf8',
    maxBuffer: 64 * 1024 * 1024
  });
  if (!out.trim()) return null;
  // Some MuPDF builds still emit chatter ahead of the payload; take the JSON.
  const start = out.search(/[{[]/);
  if (start < 0) throw new Error(`raster.py returned no JSON:\n${out}`);
  return JSON.parse(out.slice(start));
}

const escapeHtml = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

/**
 * One plate = one detail, landscape letter, image above a provenance strip.
 * The strip is the contract with the reviewer — never render a plate without it.
 */
function plateHtml(detail, png, project) {
  const b64 = readFileSync(png).toString('base64');
  const field = (label, value) => (value ? `<div class="f"><span>${escapeHtml(label)}</span><b>${escapeHtml(value)}</b></div>` : '');

  return `<!doctype html><meta charset="utf-8"><title>${escapeHtml(detail.title)}</title><style>
@page{size:Letter landscape;margin:.4in}
*{box-sizing:border-box}
/* No fixed body height: the @page box is 7.7in tall in landscape, and a taller
   body pushes the provenance title block onto a phantom second page. Cap the
   artwork instead and let the title block follow it. */
body{margin:0;font:11px/1.4 "Helvetica Neue",Helvetica,Arial,sans-serif;color:#16181d}
h1{font-size:15px;margin:0 0 2px;letter-spacing:-.01em}
.sub{font-size:10.5px;color:#5e6570;margin:0 0 8px}
.art{border:1px solid #c8ccd4;background:#fff;display:flex;align-items:center;
  justify-content:center;overflow:hidden;padding:6px;height:5.9in}
.art img{max-width:100%;max-height:5.7in;object-fit:contain}
.tb{margin-top:8px;border:1px solid #16181d;display:flex;flex-wrap:wrap}
.f{flex:1 1 1.6in;padding:5px 9px;border-right:1px solid #c8ccd4}
.f:last-child{border-right:0}
.f span{display:block;font-size:7.5px;letter-spacing:.09em;text-transform:uppercase;color:#7b818c}
.f b{font-size:11px;font-weight:600}
.note{margin-top:6px;font-size:9.5px;color:#5e6570}
.warn{color:#8f4513;font-weight:600}
</style>
<h1>${escapeHtml(detail.title)}</h1>
<p class="sub">${escapeHtml(detail.caption || '')}</p>
<div class="art"><img src="data:image/png;base64,${b64}" alt="${escapeHtml(detail.title)}"></div>
<div class="tb">
${field('Sheet', detail.sheet)}
${field('Detail', detail.detail)}
${field('Drawing set', project.set)}
${field('Set date', project.setDate)}
${field('Revision', detail.revision || project.revision)}
${field('Project', project.name)}
${field('Submittal', project.submittal)}
</div>
${detail.note ? `<p class="note">${escapeHtml(detail.note)}</p>` : ''}
${project.uncontrolled ? '<p class="note warn">UNCONTROLLED SOURCE — not verified against the current issued set. Do not submit.</p>' : ''}`;
}

function renderPdf(html, outPdf) {
  const tmp = outPdf.replace(/\.pdf$/, '.html');
  writeFileSync(tmp, html);
  execFileSync(findChrome(), ['--headless', '--disable-gpu', '--no-sandbox', `--print-to-pdf=${outPdf}`, '--no-pdf-header-footer', '--virtual-time-budget=5000', tmp], { stdio: 'ignore' });
  return outPdf;
}

function cmdPlates(manifestPath, outDir) {
  const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
  const project = manifest.project || {};
  const base = dirname(resolve(manifestPath));
  mkdirSync(outDir, { recursive: true });

  if (project.uncontrolled) {
    console.warn('\n  WARNING: project.uncontrolled is true. Plates will be watermarked and must not\n' + '  be submitted. Verify the source against the issued set first.\n');
  }

  const plates = [];
  manifest.details.forEach((d, i) => {
    const n = String(i + 1).padStart(2, '0');
    const src = resolve(base, d.source || project.source);
    if (!existsSync(src)) throw new Error(`Source PDF not found: ${src}`);

    const png = join(outDir, `detail-${n}.png`);
    const info = raster(['crop', src, String(d.page), d.rect, String(d.dpi || 300), png]);

    const pdf = join(outDir, `detail-${n}.pdf`);
    renderPdf(plateHtml(d, png, project), pdf);
    plates.push(pdf);
    console.log(`  ${n}  ${d.sheet || '?'}  ${d.title}  (${info.pixels.join('x')}px)`);
  });

  const combined = join(outDir, 'detail-plates.pdf');
  raster(['merge', combined, ...plates]);
  console.log(`\n  ${plates.length} plates -> ${combined}`);
  return combined;
}

function cmdInit(outPath) {
  const sample = {
    project: {
      name: 'Project name',
      submittal: 'A00 - 00 00 00 - Title',
      set: 'IFC Set',
      setDate: '0/00/0000',
      revision: 'Rev. 0',
      source: 'drawings.pdf',
      uncontrolled: true
    },
    details: [
      {
        title: 'Parapet coping at typical condition',
        caption: 'Coping profile, cleat anchorage and membrane termination',
        sheet: 'A3.1',
        detail: '3',
        page: 12,
        rect: '0.05,0.10,0.48,0.55',
        dpi: 300,
        note: 'Crop by fractions of the sheet, or PDF points as x0,y0,x1,y1.'
      }
    ]
  };
  writeFileSync(outPath, JSON.stringify(sample, null, 2) + '\n');
  console.log(`Wrote starter manifest: ${outPath}`);
  console.log('Set project.uncontrolled to false only after verifying the source set.');
}

function main() {
  const [cmd, ...rest] = process.argv.slice(2);
  const outFlag = rest.indexOf('--out');
  const outDir = outFlag > -1 ? rest[outFlag + 1] : 'detail-plates';
  const args = outFlag > -1 ? rest.slice(0, outFlag) : rest;

  switch (cmd) {
    case 'sheets':
      if (!args[0]) throw new Error('usage: sheets <drawings.pdf>');
      console.log(JSON.stringify(raster(['list', args[0]]), null, 2));
      break;
    case 'text':
      if (args.length < 2) throw new Error('usage: text <drawings.pdf> <page>');
      console.log(JSON.stringify(raster(['text', args[0], args[1]]), null, 2));
      break;
    case 'plates':
      if (!args[0]) throw new Error('usage: plates <manifest.json> [--out <dir>]');
      cmdPlates(args[0], outDir);
      break;
    case 'init':
      cmdInit(args[0] || 'details.json');
      break;
    default:
      console.log(readFileSync(__filename, 'utf8').split('*/')[0]);
      process.exitCode = 1;
  }
}

// Only run as a CLI; requiring the module exposes the pure helpers for tests.
if (require.main === module) {
  try {
    main();
  } catch (error) {
    console.error(`error: ${error.message}`);
    process.exitCode = 1;
  }
}

module.exports = { escapeHtml, plateHtml, findChrome, cmdInit, cmdPlates };
