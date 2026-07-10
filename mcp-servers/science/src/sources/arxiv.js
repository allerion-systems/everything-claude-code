// arXiv — https://info.arxiv.org/help/api/index.html
// Free, no API key. Returns Atom XML which we parse without a dependency.

import { fetchText } from "../http.js";

const ARXIV_ENDPOINT = "https://export.arxiv.org/api/query";

/**
 * Build the arXiv query URL.
 * @param {{ query: string, maxResults?: number, sortBy?: "relevance"|"lastUpdatedDate"|"submittedDate" }} params
 * @returns {string}
 */
export function buildArxivUrl({ query, maxResults = 10, sortBy = "relevance" }) {
  if (!query || !query.trim()) throw new Error("arXiv: query is required");
  const search = new URLSearchParams({
    search_query: query.trim(),
    start: "0",
    max_results: String(clampInt(maxResults, 1, 50)),
    sortBy,
    sortOrder: "descending",
  });
  return `${ARXIV_ENDPOINT}?${search.toString()}`;
}

/**
 * Parse an arXiv Atom feed into normalized paper records.
 * @param {string} xml
 * @returns {Array<{id: string, title: string, summary: string, authors: string[], published: string, updated: string, categories: string[], pdfUrl: string|null}>}
 */
export function parseArxivAtom(xml) {
  return matchAll(xml, /<entry\b[^>]*>([\s\S]*?)<\/entry>/g).map((entry) => {
    const links = matchAll(entry, /<link\b([^>]*)\/?>/g).map(parseAttributes);
    const pdf = links.find((l) => l.title === "pdf" || l.type === "application/pdf");
    return {
      id: text(entry, "id"),
      title: normalizeWhitespace(text(entry, "title")),
      summary: normalizeWhitespace(text(entry, "summary")),
      authors: matchAll(entry, /<author\b[^>]*>([\s\S]*?)<\/author>/g)
        .map((a) => normalizeWhitespace(text(a, "name")))
        .filter(Boolean),
      published: text(entry, "published"),
      updated: text(entry, "updated"),
      categories: matchAll(entry, /<category\b([^>]*)\/?>/g)
        .map((c) => parseAttributes(c).term)
        .filter(Boolean),
      pdfUrl: pdf ? pdf.href : null,
    };
  });
}

/**
 * Search arXiv and return normalized records.
 * @param {{ query: string, maxResults?: number, sortBy?: string }} params
 * @param {{ fetchImpl?: typeof fetch }} [deps]
 */
export async function searchArxiv(params, deps = {}) {
  const xml = await fetchText(buildArxivUrl(params), {
    fetchImpl: deps.fetchImpl,
    accept: "application/atom+xml",
  });
  return parseArxivAtom(xml);
}

// --- tiny XML helpers (scoped to this module's well-known feed shape) ---

/** @param {string} scope @param {string} tag */
function text(scope, tag) {
  const match = scope.match(new RegExp(`<${tag}\\b[^>]*>([\\s\\S]*?)</${tag}>`));
  return match ? decodeEntities(match[1].trim()) : "";
}

/** @param {string} source @param {RegExp} regex */
function matchAll(source, regex) {
  return Array.from(source.matchAll(regex), (m) => m[1]);
}

/** @param {string} attrString */
function parseAttributes(attrString) {
  /** @type {Record<string,string>} */
  const attrs = {};
  for (const m of attrString.matchAll(/(\w[\w:-]*)\s*=\s*"([^"]*)"/g)) {
    attrs[m[1]] = decodeEntities(m[2]);
  }
  return attrs;
}

/** @param {string} value */
function decodeEntities(value) {
  return value
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)))
    .replace(/&amp;/g, "&");
}

/** @param {string} value */
function normalizeWhitespace(value) {
  return value.replace(/\s+/g, " ").trim();
}

/** @param {number} value @param {number} min @param {number} max */
function clampInt(value, min, max) {
  const n = Math.trunc(Number(value));
  if (!Number.isFinite(n)) return min;
  return Math.min(max, Math.max(min, n));
}
