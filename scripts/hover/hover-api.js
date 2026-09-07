#!/usr/bin/env node
/**
 * HOVER (hover.to) API client for the construction drawing agent.
 * Zero dependencies - Node 18+ (global fetch).
 *
 * Auth (checked in order):
 *   1. HOVER_ACCESS_TOKEN                       - use directly (2h lifetime)
 *   2. Cached token in ~/.claude/hover-credentials.json (auto-refreshed)
 *   3. HOVER_CLIENT_ID + HOVER_CLIENT_SECRET + HOVER_REFRESH_TOKEN
 *      - refresh-token grant against https://hover.to/oauth/token
 *
 * NOTE: HOVER rotates refresh tokens on every exchange. The new refresh
 * token is persisted to the cache file automatically; the env var only
 * seeds the very first exchange.
 *
 * Commands:
 *   node scripts/hover/hover-api.js jobs [search terms]     List/search jobs
 *   node scripts/hover/hover-api.js job <job_id>            Job details
 *   node scripts/hover/hover-api.js pull <job_id> [--dest dir] [--versions a,b]
 *       Download measurement JSONs (summarized_json, full_json, roof_lines)
 *       and any CAD/PDF artifacts HOVER exposes for each model of the job.
 *   node scripts/hover/hover-api.js whoami                  Token sanity check
 *
 * API surface (developers.hover.to):
 *   GET https://hover.to/api/v3/jobs?search=...&page=...&per=...
 *   GET https://hover.to/api/v3/jobs/{id}
 *   GET https://hover.to/api/v3/models/{model_id}/artifacts/measurements.json?version=...
 */

const fs = require('fs');
const os = require('os');
const path = require('path');
const { formatAddress } = require('./plan-model');

const DEFAULT_MAX_PHOTOS = 24;
const PHOTO_CONCURRENCY = 6;

/** How many capture photos to download; an explicit 0 disables the download. */
function photoLimit(maxPhotos) {
  return maxPhotos === undefined || maxPhotos === null ? DEFAULT_MAX_PHOTOS : maxPhotos;
}

/** Map with bounded concurrency, preserving order of results. */
async function mapLimit(items, limit, fn) {
  const results = new Array(items.length);
  let next = 0;
  const worker = async () => {
    while (next < items.length) {
      const i = next++;
      results[i] = await fn(items[i], i);
    }
  };
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return results;
}

const BASE = process.env.HOVER_API_BASE || 'https://hover.to';
const CREDS_PATH = process.env.HOVER_CREDENTIALS_FILE ||
  path.join(os.homedir(), '.claude', 'hover-credentials.json');
const MEASUREMENT_VERSIONS = ['summarized_json', 'full_json', 'roof_lines'];

// ---------------------------------------------------------------------------
// Auth
// ---------------------------------------------------------------------------

function readCache() {
  try {
    return JSON.parse(fs.readFileSync(CREDS_PATH, 'utf8'));
  } catch (_err) {
    return {};
  }
}

function writeCache(data) {
  fs.mkdirSync(path.dirname(CREDS_PATH), { recursive: true });
  fs.writeFileSync(CREDS_PATH, JSON.stringify(data, null, 2), { mode: 0o600 });
}

async function refreshAccessToken() {
  const cache = readCache();
  const clientId = process.env.HOVER_CLIENT_ID || cache.client_id;
  const clientSecret = process.env.HOVER_CLIENT_SECRET || cache.client_secret;
  const refreshToken = cache.refresh_token || process.env.HOVER_REFRESH_TOKEN;

  if (!clientId || !clientSecret || !refreshToken) {
    throw new Error(
      'No HOVER credentials. Set HOVER_ACCESS_TOKEN for a one-off session, or set ' +
      'HOVER_CLIENT_ID, HOVER_CLIENT_SECRET and HOVER_REFRESH_TOKEN (from your HOVER ' +
      'OAuth app at https://hover.to - see docs/HOVER-CONSTRUCTION-DRAWINGS.md).'
    );
  }

  const res = await fetch(`${BASE}/oauth/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      grant_type: 'refresh_token',
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken
    })
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`HOVER token refresh failed (${res.status}): ${body.slice(0, 300)}`);
  }
  const data = await res.json();
  writeCache({
    client_id: clientId,
    client_secret: clientSecret,
    access_token: data.access_token,
    refresh_token: data.refresh_token || refreshToken,
    expires_at: Date.now() + ((data.expires_in || 7200) - 120) * 1000
  });
  return data.access_token;
}

async function getAccessToken() {
  if (process.env.HOVER_ACCESS_TOKEN) return process.env.HOVER_ACCESS_TOKEN;
  const cache = readCache();
  if (cache.access_token && cache.expires_at && Date.now() < cache.expires_at) {
    return cache.access_token;
  }
  return refreshAccessToken();
}

// ---------------------------------------------------------------------------
// HTTP
// ---------------------------------------------------------------------------

async function api(pathname, { expect = 'json' } = {}) {
  let token = await getAccessToken();
  let res = await fetch(`${BASE}${pathname}`, {
    headers: { Authorization: `Bearer ${token}`, Accept: '*/*' }
  });
  if (res.status === 401 && !process.env.HOVER_ACCESS_TOKEN) {
    token = await refreshAccessToken();
    res = await fetch(`${BASE}${pathname}`, {
      headers: { Authorization: `Bearer ${token}`, Accept: '*/*' }
    });
  }
  if (!res.ok) {
    const body = await res.text();
    const err = new Error(`HOVER API ${res.status} for ${pathname}: ${body.slice(0, 400)}`);
    err.status = res.status;
    throw err;
  }
  if (expect === 'json') return res.json();
  return Buffer.from(await res.arrayBuffer());
}

// ---------------------------------------------------------------------------
// Commands
// ---------------------------------------------------------------------------

async function cmdJobs(searchTerms) {
  const params = new URLSearchParams({ per: '50', sort_by: 'updated_at', sort_order: 'DESC' });
  if (searchTerms.length) params.set('search', searchTerms.join(' '));
  const data = await api(`/api/v3/jobs?${params}`);
  const results = data.results || data.jobs || [];
  if (results.length === 0) {
    console.log('No jobs found.');
    return;
  }
  for (const job of results) {
    const models = (job.models || []).map(m => m.id).join(',');
    console.log([
      `#${job.id}`,
      (job.name || '(unnamed)').padEnd(30).slice(0, 30),
      (job.reconstruction_state || job.state || '').padEnd(10),
      formatAddress(job.address),
      models ? `models:[${models}]` : ''
    ].join('  '));
  }
  if (data.pagination && data.pagination.next_page) {
    console.log(`(more pages available - next_page=${data.pagination.next_page})`);
  }
}

async function cmdJob(jobId) {
  const data = await api(`/api/v3/jobs/${jobId}`);
  console.log(JSON.stringify(data, null, 2));
}

function collectArtifactUrls(node, prefix, acc) {
  if (!node || typeof node !== 'object') return acc;
  for (const [key, value] of Object.entries(node)) {
    const name = prefix ? `${prefix}-${key}` : key;
    if (typeof value === 'string' && /^https?:\/\//.test(value)) {
      acc.push({ name, url: value });
    } else if (value && typeof value === 'object') {
      collectArtifactUrls(value, name, acc);
    }
  }
  return acc;
}

function extFromUrl(url, fallback = 'bin') {
  const m = /\.([a-z0-9]{2,5})(?:\?|$)/i.exec(url);
  return m ? m[1].toLowerCase() : fallback;
}

async function cmdPull(jobId, options) {
  const dest = path.resolve(options.dest || path.join('hover-projects', String(jobId)));
  fs.mkdirSync(dest, { recursive: true });

  const job = (await api(`/api/v3/jobs/${jobId}`));
  const jobData = job.job || job;
  fs.writeFileSync(path.join(dest, 'job.json'), JSON.stringify(jobData, null, 2));
  console.log(`Job #${jobId}: ${jobData.name || ''} ${formatAddress(jobData.address)}`);
  console.log(`  -> ${path.join(dest, 'job.json')}`);

  const models = jobData.models || [];
  if (models.length === 0) {
    console.log('  No models on this job yet (still processing?). Nothing more to download.');
    return;
  }

  const versions = options.versions || MEASUREMENT_VERSIONS;
  for (const model of models) {
    const modelDir = models.length > 1 ? path.join(dest, `model-${model.id}`) : dest;
    fs.mkdirSync(modelDir, { recursive: true });

    for (const version of versions) {
      try {
        const data = await api(`/api/v3/models/${model.id}/artifacts/measurements.json?version=${version}`);
        const file = path.join(modelDir, `measurements-${version}.json`);
        fs.writeFileSync(file, JSON.stringify(data, null, 2));
        console.log(`  model ${model.id}: ${version} -> ${file}`);
      } catch (err) {
        console.log(`  model ${model.id}: ${version} unavailable (${err.status || err.message})`);
      }
    }

    // Signed artifact URLs advertised on the job payload (measurement PDFs,
    // CAD exports like DXF/DWG/SKP when the deliverable includes them).
    const artifacts = collectArtifactUrls(model.artifacts || {}, '', []);
    for (const { name, url } of artifacts) {
      try {
        const res = await fetch(url);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const buf = Buffer.from(await res.arrayBuffer());
        const file = path.join(modelDir, `${name}.${extFromUrl(url)}`);
        fs.writeFileSync(file, buf);
        console.log(`  model ${model.id}: artifact ${name} -> ${file}`);
      } catch (err) {
        console.log(`  model ${model.id}: artifact ${name} failed (${err.message})`);
      }
    }

    // Capture photos: HOVER measures walls/roofs but NOT decks - the photos
    // are how the agent picks up deck dimensions (scale from measured
    // elements in frame). Cap the download to keep pulls fast.
    const images = (model.images || []).slice(0, photoLimit(options.maxPhotos));
    if (images.length > 0) {
      const photoDir = path.join(modelDir, 'photos');
      fs.mkdirSync(photoDir, { recursive: true });
      // Photos are independent: download a bounded batch in parallel.
      const results = await mapLimit(images, PHOTO_CONCURRENCY, async image => {
        if (!image.url) return 0;
        try {
          const res = await fetch(image.url);
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          const buf = Buffer.from(await res.arrayBuffer());
          fs.writeFileSync(path.join(photoDir, `photo-${image.id}.${extFromUrl(image.url, 'jpg')}`), buf);
          return 1;
        } catch (_err) { return 0; /* skip unavailable photos */ }
      });
      const downloaded = results.reduce((sum, ok) => sum + ok, 0);
      console.log(`  model ${model.id}: ${downloaded}/${images.length} capture photos -> ${photoDir}`);
    }
  }

  console.log(`\nPulled to ${dest}`);
  console.log('Next: node scripts/hover/generate-plans.js <measurements file or adapted plan-model.json> --out ' + path.join(dest, 'drawings'));
}

async function cmdWhoami() {
  const data = await api('/api/v3/jobs?per=1');
  const count = (data.results || []).length;
  console.log(`Token OK. API reachable; ${count > 0 ? 'jobs visible.' : 'no jobs visible for this account.'}`);
}

// ---------------------------------------------------------------------------

function numericArg(name, raw, { integer = false, min = -Infinity } = {}) {
  const value = Number(raw);
  if (raw === undefined || raw === '' || !Number.isFinite(value) ||
      (integer && !Number.isInteger(value)) || value < min) {
    console.error(`Invalid value for ${name}: "${raw}" - expected a${integer ? 'n integer' : ' number'}${min > -Infinity ? ` >= ${min}` : ''}`);
    process.exit(2);
  }
  return value;
}

function parseArgs(argv) {
  const args = { _: [] };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--dest') args.dest = argv[++i];
    else if (a === '--versions') args.versions = argv[++i].split(',').map(s => s.trim());
    else if (a === '--max-photos') args.maxPhotos = numericArg('--max-photos', argv[++i], { integer: true, min: 0 });
    else args._.push(a);
  }
  return args;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const [command, ...rest] = args._;
  try {
    if (command === 'jobs') await cmdJobs(rest);
    else if (command === 'job' && rest[0]) await cmdJob(rest[0]);
    else if (command === 'pull' && rest[0]) await cmdPull(rest[0], args);
    else if (command === 'whoami') await cmdWhoami();
    else {
      console.error('Usage: hover-api.js <jobs [search]|job <id>|pull <id> [--dest dir] [--versions a,b]|whoami>');
      process.exit(2);
    }
  } catch (err) {
    console.error(err.message);
    process.exit(1);
  }
}

if (require.main === module) main();

module.exports = { getAccessToken, api, collectArtifactUrls, extFromUrl, formatAddress, photoLimit, DEFAULT_MAX_PHOTOS };
