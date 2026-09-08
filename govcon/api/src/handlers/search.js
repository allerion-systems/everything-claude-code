// POST /v1/search — plain-English opportunity discovery.
//
// "guard booths we can fabricate, small business set-aside" becomes a
// structured query, sweeps SAM.gov, and returns notices scored for whether
// Allerion can actually bid them.
//
// Body: { query: string }
// Response: { interpreted: {...}, results: [...], note: string }

import { client, models, noKey, json, readJson, clamp, ENTITY } from '../openai.js';
import { search as samSearch, detail as samDetail, NOTICE_TYPES } from '../sam.js';

const QUERY_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['keywords', 'naics', 'setAsides', 'states', 'intent'],
  properties: {
    keywords: {
      type: 'array', maxItems: 6, items: { type: 'string' },
      description: 'Search phrases as a contracting officer would title the work. Concrete nouns, not adjectives.',
    },
    naics: {
      type: 'array', maxItems: 6, items: { type: 'string' },
      description: 'Six-digit NAICS codes implied by the request. Empty if none are clearly implied.',
    },
    setAsides: {
      type: 'array', maxItems: 6, items: { type: 'string' },
      description: "SAM set-aside codes: '' unrestricted, SBA, SBP, SDVOSBC, SDVOSBS, 8A, WOSB, HZC. Empty means any.",
    },
    states: {
      type: 'array', maxItems: 6, items: { type: 'string' },
      description: 'Two-letter state codes for place of performance. Empty means anywhere.',
    },
    intent: {
      type: 'string',
      description: 'One sentence restating what the operator is hunting for, so they can confirm the read.',
    },
  },
};

const MAX_DETAILS = 18;

export async function handleSearch(request, env) {
  const openai = client(env);
  if (!openai) return noKey();

  let body;
  try { body = await readJson(request); } catch (err) { return json({ error: 'bad_request', message: err.message }, 400); }

  const query = clamp(body && body.query, 'query').trim();
  if (!query) return json({ error: 'bad_request', message: 'query is required' }, 400);

  // 1. Natural language -> structured search parameters.
  let interpreted;
  try {
    const res = await openai.responses.create({
      model: models(env).extract,
      instructions: `Translate a federal contracting operator's plain-English request into SAM.gov search parameters.

${ENTITY}

Choose keywords that match how solicitations are actually titled — "roof replacement", "guard booth",
"modular building" — rather than how a person describes a business. Only fill naics, setAsides and
states when the request clearly implies them; guessing narrows the sweep and hides real work.`,
      input: query,
      text: { format: { type: 'json_schema', name: 'sam_query', schema: QUERY_SCHEMA, strict: true } },
      max_output_tokens: 600,
    });
    interpreted = JSON.parse(res.output_text);
  } catch (err) {
    const status = err && err.status;
    if (status === 401) return json({ error: 'auth', message: 'OpenAI rejected the API key.' }, 502);
    if (status === 429) return json({ error: 'rate_limited', message: 'Rate limited — try again shortly.' }, 429);
    return json({ error: 'upstream', message: 'Could not interpret that search.' }, 502);
  }

  // 2. Sweep SAM.gov on the extracted keywords.
  const now = Date.now();
  const seen = new Map();
  const keywords = (interpreted.keywords || []).slice(0, 6);
  const sweeps = await Promise.allSettled(keywords.map((k) => samSearch(k, 20)));
  for (const s of sweeps) {
    if (s.status !== 'fulfilled') continue;
    for (const r of s.value) {
      if (!NOTICE_TYPES[(r.type || {}).code]) continue;
      const due = r.responseDate ? Date.parse(r.responseDate) : null;
      if (due && due < now) continue;
      if (!seen.has(r._id)) seen.set(r._id, true);
    }
  }
  if (!seen.size) {
    return json({ interpreted, results: [], note: 'No active notices matched those keywords.' });
  }

  // 3. Pull detail for the top slice, then filter on the structured criteria.
  const ids = [...seen.keys()].slice(0, MAX_DETAILS);
  const settled = await Promise.allSettled(ids.map(samDetail));
  let rows = settled.filter((s) => s.status === 'fulfilled').map((s) => s.value);

  const wantNaics = new Set(interpreted.naics || []);
  const wantStates = new Set((interpreted.states || []).map((s) => s.toUpperCase()));
  const wantSetAsides = new Set(interpreted.setAsides || []);
  if (wantNaics.size) rows = rows.filter((r) => wantNaics.has(r.naics));
  if (wantStates.size) rows = rows.filter((r) => wantStates.has((r.placeOfPerformance.split(', ')[1] || '').toUpperCase()));
  if (wantSetAsides.size) rows = rows.filter((r) => wantSetAsides.has(r.setAside));

  // 4. Mark what Allerion can actually bid. Small business or unrestricted only —
  //    every other set-aside requires a certification the entity does not hold.
  const BIDDABLE = new Set(['', 'SBA', 'SBP']);
  rows = rows.map((r) => ({
    ...r,
    eligible: BIDDABLE.has(r.setAside),
    daysOut: r.responseDeadline
      ? Math.floor((Date.parse(r.responseDeadline) - now) / 86400000)
      : null,
  }));
  rows.sort((a, b) => Number(b.eligible) - Number(a.eligible)
    || (a.responseDeadline || '9999').localeCompare(b.responseDeadline || '9999'));

  const blocked = rows.filter((r) => !r.eligible).length;
  return json({
    interpreted,
    results: rows.slice(0, 25),
    note: blocked
      ? `${blocked} of these are set aside for certifications Allerion does not hold — shown last, marked ineligible.`
      : '',
  });
}
