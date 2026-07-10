// OpenAlex — https://docs.openalex.org
// Free, no key. Broad scholarly-works search across every discipline.

import { fetchJson, contactEmail } from "../http.js";

const OPENALEX_WORKS = "https://api.openalex.org/works";

/**
 * @param {{ query: string, maxResults?: number }} params
 * @returns {string}
 */
export function buildOpenAlexUrl({ query, maxResults = 10 }) {
  if (!query || !query.trim()) throw new Error("OpenAlex: query is required");
  const search = new URLSearchParams({
    search: query.trim(),
    per_page: String(clampInt(maxResults, 1, 50)),
  });
  const email = contactEmail();
  if (email) search.set("mailto", email);
  return `${OPENALEX_WORKS}?${search.toString()}`;
}

/**
 * @param {any} json
 * @returns {{ count: number|null, results: Array<{id: string, doi: string|null, title: string, year: number|null, citations: number, authors: string[], venue: string, openAccessUrl: string|null}> }}
 */
export function parseOpenAlexJson(json) {
  const count = json && json.meta && typeof json.meta.count === "number" ? json.meta.count : null;
  const works = json && Array.isArray(json.results) ? json.results : [];
  const results = works.map((work) => {
    const location = work.primary_location || {};
    const source = location.source || {};
    const oa = work.open_access || {};
    return {
      id: work.id || "",
      doi: work.doi || null,
      title: work.display_name || work.title || "",
      year: work.publication_year != null ? Number(work.publication_year) : null,
      citations: Number(work.cited_by_count) || 0,
      authors: Array.isArray(work.authorships)
        ? work.authorships.map((a) => a && a.author && a.author.display_name).filter(Boolean)
        : [],
      venue: source.display_name || "",
      openAccessUrl: oa.oa_url || null,
    };
  });
  return { count, results };
}

/**
 * @param {{ query: string, maxResults?: number }} params
 * @param {{ fetchImpl?: typeof fetch }} [deps]
 */
export async function searchOpenAlex(params, deps = {}) {
  const json = await fetchJson(buildOpenAlexUrl(params), { fetchImpl: deps.fetchImpl });
  return parseOpenAlexJson(json);
}

/** @param {number} value @param {number} min @param {number} max */
function clampInt(value, min, max) {
  const n = Math.trunc(Number(value));
  if (!Number.isFinite(n)) return min;
  return Math.min(max, Math.max(min, n));
}
