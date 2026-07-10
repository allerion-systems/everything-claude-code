// CrossRef REST API — https://api.crossref.org
// Free, no key. Resolve a DOI to structured citation metadata.

import { fetchJson, contactEmail } from "../http.js";

const CROSSREF_WORKS = "https://api.crossref.org/works";

/**
 * Normalize user input into a bare DOI (strips URL and "doi:" prefixes).
 * @param {string} input
 * @returns {string}
 */
export function normalizeDoi(input) {
  if (!input || !input.trim()) throw new Error("CrossRef: doi is required");
  let doi = input.trim();
  doi = doi.replace(/^https?:\/\/(dx\.)?doi\.org\//i, "");
  doi = doi.replace(/^doi:\s*/i, "");
  if (!/^10\.\d{4,9}\/\S+$/.test(doi)) {
    throw new Error(`CrossRef: "${input}" does not look like a DOI (expected 10.xxxx/...)`);
  }
  return doi;
}

/**
 * @param {string} doi
 * @returns {string}
 */
export function buildCrossrefWorkUrl(doi) {
  const normalized = normalizeDoi(doi);
  const url = `${CROSSREF_WORKS}/${encodeURIComponent(normalized)}`;
  const email = contactEmail();
  return email ? `${url}?mailto=${encodeURIComponent(email)}` : url;
}

/**
 * @param {any} json
 * @returns {{doi: string, title: string, authors: string[], journal: string, publisher: string, type: string, published: string, citations: number, url: string}|null}
 */
export function parseCrossrefWork(json) {
  const message = json && json.message;
  if (!message || !message.DOI) return null;
  return {
    doi: message.DOI,
    title: firstOf(message.title),
    authors: Array.isArray(message.author)
      ? message.author.map(formatAuthor).filter(Boolean)
      : [],
    journal: firstOf(message["container-title"]),
    publisher: message.publisher || "",
    type: message.type || "",
    published: formatDateParts(message.issued || message.published),
    citations: Number(message["is-referenced-by-count"]) || 0,
    url: message.URL || `https://doi.org/${message.DOI}`,
  };
}

/**
 * @param {string} doi
 * @param {{ fetchImpl?: typeof fetch }} [deps]
 */
export async function resolveDoi(doi, deps = {}) {
  const json = await fetchJson(buildCrossrefWorkUrl(doi), { fetchImpl: deps.fetchImpl });
  return parseCrossrefWork(json);
}

/** @param {string[]|undefined} arr */
function firstOf(arr) {
  return Array.isArray(arr) && arr.length ? String(arr[0]).trim() : "";
}

/** @param {{given?: string, family?: string, name?: string}} author */
function formatAuthor(author) {
  if (!author) return "";
  if (author.name) return author.name;
  return [author.given, author.family].filter(Boolean).join(" ").trim();
}

/** @param {{ ["date-parts"]?: number[][] }|undefined} dateObj */
function formatDateParts(dateObj) {
  const parts = dateObj && dateObj["date-parts"] && dateObj["date-parts"][0];
  if (!Array.isArray(parts) || parts.length === 0) return "";
  return parts.map((n) => String(n).padStart(2, "0")).join("-");
}
