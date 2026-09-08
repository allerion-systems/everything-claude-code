// Shared helpers for the govcon watcher pipeline (watch.js, market.js, draft.js).
// Zero dependencies — plain Node 18+ (global fetch).

const fs = require('fs');
const path = require('path');

const SAM_SEARCH = 'https://sam.gov/api/prod/sgs/v1/search/';
const SAM_DETAIL = 'https://sam.gov/api/prod/opps/v2/opportunities/';
const USASPENDING = 'https://api.usaspending.gov/api/v2/search/spending_by_award/';

// Notice type codes worth tracking pre-award.
const NOTICE_TYPES = {
  o: 'Solicitation',
  k: 'Combined Synopsis/Solicitation',
  p: 'Presolicitation',
  r: 'Sources Sought',
};

const SET_ASIDE_LABELS = {
  '': 'Unrestricted',
  SBA: 'Total Small Business',
  SBP: 'Partial Small Business',
  SDVOSBC: 'SDVOSB Set-Aside',
  SDVOSBS: 'SDVOSB Sole Source',
  VSA: 'VOSB Set-Aside',
  VSS: 'VOSB Sole Source',
  '8A': '8(a) Set-Aside',
  '8AN': '8(a) Sole Source',
  WOSB: 'WOSB Set-Aside',
  WOSBSS: 'WOSB Sole Source',
  EDWOSB: 'EDWOSB Set-Aside',
  EDWOSBSS: 'EDWOSB Sole Source',
  HZC: 'HUBZone Set-Aside',
  HZS: 'HUBZone Sole Source',
};

async function getJson(url, opts = {}, retries = 2) {
  for (let attempt = 0; ; attempt++) {
    try {
      const res = await fetch(url, {
        headers: { 'User-Agent': 'Mozilla/5.0 (govcon-watch)', ...(opts.headers || {}) },
        ...opts,
      });
      if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
      return await res.json();
    } catch (err) {
      if (attempt >= retries) throw err;
      await new Promise((r) => setTimeout(r, 1500 * (attempt + 1)));
    }
  }
}

async function samSearch(q, size = 15) {
  const params = new URLSearchParams({
    index: 'opp', page: '0', mode: 'search', sort: '-modifiedDate',
    size: String(size), mfe: 'true', q, qMode: 'ALL', is_active: 'true',
  });
  const data = await getJson(`${SAM_SEARCH}?${params}`);
  return (data._embedded && data._embedded.results) || [];
}

async function samDetail(noticeId) {
  const d = await getJson(`${SAM_DETAIL}${noticeId}?random=${Date.now()}`);
  const d2 = d.data2 || {};
  const sol = d2.solicitation || {};
  const naics = ((d2.naics || [])[0] || {});
  let description = '';
  if (typeof d.description === 'string') description = d.description;
  else if (Array.isArray(d.description)) {
    description = d.description.map((x) => (x && (x.body || x.content)) || '').join('\n');
  }
  return {
    id: noticeId,
    title: d2.title || '',
    solicitationNumber: d2.solicitationNumber || '',
    type: (d2.type || {}).value || d2.type || '',
    setAside: sol.setAside || '',
    setAsideLabel: SET_ASIDE_LABELS[sol.setAside || ''] || sol.setAside || 'Unrestricted',
    responseDeadline: (sol.deadlines || {}).response || '',
    naics: Array.isArray(naics.code) ? naics.code[0] : naics.code || '',
    psc: d2.classificationCode || '',
    placeOfPerformance: fmtPop(d2.placeOfPerformance),
    pointOfContact: (d2.pointOfContact || []).map((p) => `${p.fullName || ''} <${p.email || ''}>`).join('; '),
    description: stripHtml(description).slice(0, 4000),
    url: `https://sam.gov/opp/${noticeId}/view`,
  };
}

async function usaspendingAwards({ naics = [], keywords = [], months = 24, limit = 50 }) {
  const end = new Date();
  const start = new Date(end);
  start.setMonth(start.getMonth() - months);
  const filters = {
    time_period: [{ start_date: iso(start), end_date: iso(end) }],
    award_type_codes: ['A', 'B', 'C', 'D'],
  };
  if (naics.length) filters.naics_codes = naics;
  if (keywords.length) filters.keywords = keywords;
  const body = {
    filters,
    fields: ['Award ID', 'Recipient Name', 'Award Amount', 'Awarding Agency', 'Awarding Sub Agency', 'Start Date'],
    sort: 'Award Amount', order: 'desc', limit, page: 1,
  };
  const data = await getJson(USASPENDING, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  return data.results || [];
}

function awardStats(rows) {
  const amounts = rows.map((r) => Number(r['Award Amount']) || 0).filter((n) => n > 0).sort((a, b) => a - b);
  if (!amounts.length) return null;
  const mid = Math.floor(amounts.length / 2);
  const median = amounts.length % 2 ? amounts[mid] : (amounts[mid - 1] + amounts[mid]) / 2;
  const mean = amounts.reduce((a, b) => a + b, 0) / amounts.length;
  const byRecipient = {};
  for (const r of rows) byRecipient[r['Recipient Name']] = (byRecipient[r['Recipient Name']] || 0) + 1;
  const topRecipients = Object.entries(byRecipient).sort((a, b) => b[1] - a[1]).slice(0, 5);
  return { count: amounts.length, min: amounts[0], max: amounts[amounts.length - 1], median, mean, topRecipients };
}

function stripHtml(s) {
  return String(s || '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/\s+/g, ' ').trim();
}

function fmtPop(pop) {
  if (!pop) return '';
  const city = (pop.city || {}).name || '';
  const state = (pop.state || {}).code || '';
  return [city, state].filter(Boolean).join(', ');
}

function iso(d) { return d.toISOString().slice(0, 10); }

function usd(n) {
  return '$' + Number(n).toLocaleString('en-US', { maximumFractionDigits: 0 });
}

function repoRoot() {
  // scripts/govcon/lib.js -> repo root is two levels up
  return path.resolve(__dirname, '..', '..');
}

function readJson(file, fallback) {
  try { return JSON.parse(fs.readFileSync(file, 'utf8')); } catch { return fallback; }
}

function writeJson(file, obj) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(obj, null, 1));
}

module.exports = {
  NOTICE_TYPES, SET_ASIDE_LABELS,
  samSearch, samDetail, usaspendingAwards, awardStats,
  stripHtml, usd, iso, repoRoot, readJson, writeJson,
};
