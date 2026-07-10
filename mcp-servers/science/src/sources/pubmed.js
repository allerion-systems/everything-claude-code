// PubMed via NCBI E-utilities — https://www.ncbi.nlm.nih.gov/books/NBK25501/
// Free. An API key (env NCBI_API_KEY) raises the rate limit but is optional.

import { fetchJson, contactEmail } from "../http.js";

const EUTILS = "https://eutils.ncbi.nlm.nih.gov/entrez/eutils";

/** Shared NCBI identification params (tool + optional email + optional api key). */
function ncbiParams() {
  const params = { tool: "science-mcp" };
  const email = contactEmail();
  if (email) params.email = email;
  const apiKey = process.env.NCBI_API_KEY;
  if (apiKey && apiKey.trim()) params.api_key = apiKey.trim();
  return params;
}

/**
 * Step 1: find PMIDs matching a query.
 * @param {{ query: string, maxResults?: number }} params
 * @returns {string}
 */
export function buildEsearchUrl({ query, maxResults = 10 }) {
  if (!query || !query.trim()) throw new Error("PubMed: query is required");
  const search = new URLSearchParams({
    db: "pubmed",
    term: query.trim(),
    retmode: "json",
    retmax: String(clampInt(maxResults, 1, 50)),
    sort: "relevance",
    ...ncbiParams(),
  });
  return `${EUTILS}/esearch.fcgi?${search.toString()}`;
}

/**
 * @param {any} json
 * @returns {{ count: number, ids: string[] }}
 */
export function parseEsearchJson(json) {
  const result = json && json.esearchresult;
  if (!result) return { count: 0, ids: [] };
  return {
    count: Number(result.count) || 0,
    ids: Array.isArray(result.idlist) ? result.idlist.map(String) : [],
  };
}

/**
 * Step 2: fetch summaries for a set of PMIDs.
 * @param {{ ids: string[] }} params
 * @returns {string}
 */
export function buildEsummaryUrl({ ids }) {
  if (!ids || ids.length === 0) throw new Error("PubMed: ids are required");
  const search = new URLSearchParams({
    db: "pubmed",
    id: ids.join(","),
    retmode: "json",
    ...ncbiParams(),
  });
  return `${EUTILS}/esummary.fcgi?${search.toString()}`;
}

/**
 * @param {any} json
 * @returns {Array<{pmid: string, title: string, journal: string, pubdate: string, authors: string[], doi: string|null, url: string}>}
 */
export function parseEsummaryJson(json) {
  const result = json && json.result;
  if (!result || !Array.isArray(result.uids)) return [];
  return result.uids.map((uid) => {
    const record = result[uid] || {};
    const doi = findDoi(record);
    return {
      pmid: String(uid),
      title: (record.title || "").trim(),
      journal: record.fulljournalname || record.source || "",
      pubdate: record.pubdate || record.sortpubdate || "",
      authors: Array.isArray(record.authors)
        ? record.authors.map((a) => a && a.name).filter(Boolean)
        : [],
      doi,
      url: `https://pubmed.ncbi.nlm.nih.gov/${uid}/`,
    };
  });
}

/**
 * Run the two-step PubMed search and return normalized records.
 * @param {{ query: string, maxResults?: number }} params
 * @param {{ fetchImpl?: typeof fetch }} [deps]
 */
export async function searchPubmed(params, deps = {}) {
  const searchJson = await fetchJson(buildEsearchUrl(params), { fetchImpl: deps.fetchImpl });
  const { count, ids } = parseEsearchJson(searchJson);
  if (ids.length === 0) return { count, results: [] };
  const summaryJson = await fetchJson(buildEsummaryUrl({ ids }), { fetchImpl: deps.fetchImpl });
  return { count, results: parseEsummaryJson(summaryJson) };
}

/** @param {any} record */
function findDoi(record) {
  const ids = Array.isArray(record.articleids) ? record.articleids : [];
  const doiEntry = ids.find((entry) => entry && entry.idtype === "doi");
  if (doiEntry && doiEntry.value) return String(doiEntry.value);
  if (typeof record.elocationid === "string") {
    const match = record.elocationid.match(/10\.\d{4,9}\/\S+/);
    if (match) return match[0];
  }
  return null;
}

/** @param {number} value @param {number} min @param {number} max */
function clampInt(value, min, max) {
  const n = Math.trunc(Number(value));
  if (!Number.isFinite(n)) return min;
  return Math.min(max, Math.max(min, n));
}
