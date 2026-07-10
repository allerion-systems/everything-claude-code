// ClinicalTrials.gov API v2 — https://clinicaltrials.gov/data-api/api
// Free, no key. Search the registry of clinical studies.

import { fetchJson } from "../http.js";

const CTG_ENDPOINT = "https://clinicaltrials.gov/api/v2/studies";

const VALID_STATUS = new Set([
  "RECRUITING",
  "NOT_YET_RECRUITING",
  "ACTIVE_NOT_RECRUITING",
  "COMPLETED",
  "ENROLLING_BY_INVITATION",
  "SUSPENDED",
  "TERMINATED",
  "WITHDRAWN",
  "AVAILABLE",
  "NO_LONGER_AVAILABLE",
]);

/**
 * @param {{ query: string, maxResults?: number, status?: string }} params
 * @returns {string}
 */
export function buildClinicalTrialsUrl({ query, maxResults = 10, status }) {
  if (!query || !query.trim()) throw new Error("ClinicalTrials: query is required");
  const search = new URLSearchParams({
    "query.term": query.trim(),
    pageSize: String(clampInt(maxResults, 1, 50)),
    format: "json",
    countTotal: "true",
  });
  if (status) {
    const normalized = status.trim().toUpperCase();
    if (!VALID_STATUS.has(normalized)) {
      throw new Error(`ClinicalTrials: unknown status "${status}". Valid: ${[...VALID_STATUS].join(", ")}`);
    }
    search.set("filter.overallStatus", normalized);
  }
  return `${CTG_ENDPOINT}?${search.toString()}`;
}

/**
 * @param {any} json
 * @returns {{ total: number|null, results: Array<{nctId: string, title: string, status: string, phases: string[], conditions: string[], sponsor: string, startDate: string, url: string}> }}
 */
export function parseClinicalTrialsJson(json) {
  const studies = json && Array.isArray(json.studies) ? json.studies : [];
  const total = json && typeof json.totalCount === "number" ? json.totalCount : null;
  const results = studies.map((study) => {
    const section = (study && study.protocolSection) || {};
    const id = section.identificationModule || {};
    const statusModule = section.statusModule || {};
    const design = section.designModule || {};
    const conditions = section.conditionsModule || {};
    const sponsor = (section.sponsorCollaboratorsModule && section.sponsorCollaboratorsModule.leadSponsor) || {};
    const nctId = id.nctId || "";
    return {
      nctId,
      title: id.briefTitle || id.officialTitle || "",
      status: statusModule.overallStatus || "",
      phases: Array.isArray(design.phases) ? design.phases : [],
      conditions: Array.isArray(conditions.conditions) ? conditions.conditions : [],
      sponsor: sponsor.name || "",
      startDate: (statusModule.startDateStruct && statusModule.startDateStruct.date) || "",
      url: nctId ? `https://clinicaltrials.gov/study/${nctId}` : "",
    };
  });
  return { total, results };
}

/**
 * @param {{ query: string, maxResults?: number, status?: string }} params
 * @param {{ fetchImpl?: typeof fetch }} [deps]
 */
export async function searchClinicalTrials(params, deps = {}) {
  const json = await fetchJson(buildClinicalTrialsUrl(params), { fetchImpl: deps.fetchImpl });
  return parseClinicalTrialsJson(json);
}

/** @param {number} value @param {number} min @param {number} max */
function clampInt(value, min, max) {
  const n = Math.trunc(Number(value));
  if (!Number.isFinite(n)) return min;
  return Math.min(max, Math.max(min, n));
}
