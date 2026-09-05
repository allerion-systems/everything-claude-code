/**
 * GovCon pipeline shared logic (pure functions — covered by tests/govcon/lib.test.js).
 *
 * Data source: SAM.gov public search API (no key required):
 *   search:  https://sam.gov/api/prod/sgs/v1/search/?index=opp&...   (Accept: application/hal+json)
 *   detail:  https://sam.gov/api/prod/opps/v2/opportunities/{id}
 *   files:   https://sam.gov/api/prod/opps/v3/opportunities/{id}/resources
 */

const SEARCH_BASE = 'https://sam.gov/api/prod/sgs/v1/search/';
const DETAIL_BASE = 'https://sam.gov/api/prod/opps/v2/opportunities/';

function buildSearchUrl(keyword, size = 25) {
  const params = new URLSearchParams({
    index: 'opp',
    page: '0',
    sort: '-modifiedDate',
    size: String(size),
    mode: 'search',
    responseType: 'json',
    q: keyword,
    qMode: 'ALL',
    is_active: 'true',
  });
  return `${SEARCH_BASE}?${params.toString()}`;
}

function detailUrl(noticeId) {
  return `${DETAIL_BASE}${noticeId}`;
}

/** Notice type codes we treat as biddable supply solicitations. */
function isBiddableType(typeCode, allowed) {
  return allowed.includes(typeCode);
}

/** Response deadline must land within [minDays, maxDays] from `now`. */
function withinWindow(responseDateIso, now, minDays, maxDays) {
  if (!responseDateIso) return false;
  const deadline = new Date(responseDateIso);
  if (Number.isNaN(deadline.getTime())) return false;
  const msPerDay = 24 * 60 * 60 * 1000;
  const days = (deadline.getTime() - now.getTime()) / msPerDay;
  return days >= minDays && days <= maxDays;
}

/**
 * Set-aside eligibility. SAM detail exposes solicitation.setAside as a code
 * ("SBA", "SDVOSBC", ...), "NONE", or null/undefined for unrestricted.
 */
function eligibleSetAside(setAsideCode, eligibleList) {
  const code = setAsideCode == null || setAsideCode === '' ? 'NONE' : String(setAsideCode);
  return eligibleList.includes(code);
}

/** First lane (by insertion order) whose keyword appears in the title; null if none. */
function laneForTitle(title, lanes) {
  const t = (title || '').toLowerCase();
  for (const [lane, keywords] of Object.entries(lanes)) {
    for (const kw of keywords) {
      const parts = kw.toLowerCase().split(/\s+/);
      if (parts.some((p) => t.includes(p))) return lane;
    }
  }
  return null;
}

function digestRow(n) {
  const cells = [
    n.solicitationNumber || '—',
    (n.title || '').replace(/\|/g, '/').slice(0, 70),
    n.setAside || 'NONE',
    (n.responseDate || '').slice(0, 10),
    `https://sam.gov/opp/${n.id}/view`,
  ];
  return `| ${cells.join(' | ')} |`;
}

/** Non-clobbering digest path: <dir>/<date>.md, else <date>-run2.md, -run3... */
function digestPath(dir, dateStr, exists) {
  let candidate = `${dir}/${dateStr}.md`;
  let n = 2;
  while (exists(candidate)) {
    candidate = `${dir}/${dateStr}-run${n}.md`;
    n += 1;
  }
  return candidate;
}

module.exports = {
  buildSearchUrl,
  detailUrl,
  isBiddableType,
  withinWindow,
  eligibleSetAside,
  laneForTitle,
  digestRow,
  digestPath,
};
