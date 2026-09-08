// SAM.gov reads for the edge runtime. Mirrors scripts/govcon/lib.js, but uses
// only fetch so it runs on Workers.

const SEARCH = 'https://sam.gov/api/prod/sgs/v1/search/';
const DETAIL = 'https://sam.gov/api/prod/opps/v2/opportunities/';

export const NOTICE_TYPES = { o: 'Solicitation', k: 'Combined Synopsis/Solicitation', p: 'Presolicitation', r: 'Sources Sought' };

export const SET_ASIDE_LABELS = {
  '': 'Unrestricted', SBA: 'Total Small Business', SBP: 'Partial Small Business',
  SDVOSBC: 'SDVOSB Set-Aside', SDVOSBS: 'SDVOSB Sole Source', VSA: 'VOSB Set-Aside',
  VSS: 'VOSB Sole Source', '8A': '8(a) Set-Aside', '8AN': '8(a) Sole Source',
  WOSB: 'WOSB Set-Aside', WOSBSS: 'WOSB Sole Source', EDWOSB: 'EDWOSB Set-Aside',
  EDWOSBSS: 'EDWOSB Sole Source', HZC: 'HUBZone Set-Aside', HZS: 'HUBZone Sole Source',
};

async function getJson(url) {
  const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0 (allerion-warboard)' } });
  if (!res.ok) throw new Error(`SAM.gov HTTP ${res.status}`);
  return res.json();
}

export async function search(q, size = 20) {
  const params = new URLSearchParams({
    index: 'opp', page: '0', mode: 'search', sort: '-modifiedDate',
    size: String(size), mfe: 'true', q, qMode: 'ALL', is_active: 'true',
  });
  const data = await getJson(`${SEARCH}?${params}`);
  return (data._embedded && data._embedded.results) || [];
}

function stripHtml(s) {
  return String(s || '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/\s+/g, ' ')
    .trim();
}

export async function detail(noticeId) {
  const d = await getJson(`${DETAIL}${noticeId}?random=${Date.now()}`);
  const d2 = d.data2 || {};
  const sol = d2.solicitation || {};
  const naics = (d2.naics || [])[0] || {};
  const pop = d2.placeOfPerformance || null;
  let description = '';
  if (typeof d.description === 'string') description = d.description;
  else if (Array.isArray(d.description)) {
    description = d.description.map((x) => (x && (x.body || x.content)) || '').join('\n');
  }
  const setAside = sol.setAside || '';
  return {
    id: noticeId,
    title: d2.title || '',
    solicitationNumber: d2.solicitationNumber || '',
    setAside,
    setAsideLabel: SET_ASIDE_LABELS[setAside] || setAside || 'Unrestricted',
    responseDeadline: (sol.deadlines || {}).response || '',
    naics: Array.isArray(naics.code) ? naics.code[0] : naics.code || '',
    psc: d2.classificationCode || '',
    placeOfPerformance: pop
      ? [(pop.city || {}).name, (pop.state || {}).code].filter(Boolean).join(', ')
      : '',
    pointOfContact: (d2.pointOfContact || []).map((p) => p.email).filter(Boolean).join('; '),
    description: stripHtml(description).slice(0, 1200),
    url: `https://sam.gov/opp/${noticeId}/view`,
  };
}
