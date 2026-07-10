import { test } from "node:test";
import assert from "node:assert/strict";

import {
  buildClinicalTrialsUrl,
  parseClinicalTrialsJson,
  searchClinicalTrials,
} from "../src/sources/clinicaltrials.js";

const SAMPLE = {
  totalCount: 3,
  studies: [
    {
      protocolSection: {
        identificationModule: { nctId: "NCT01234567", briefTitle: "A Melanoma Study" },
        statusModule: { overallStatus: "RECRUITING", startDateStruct: { date: "2022-01-01" } },
        designModule: { phases: ["PHASE2"] },
        conditionsModule: { conditions: ["Melanoma"] },
        sponsorCollaboratorsModule: { leadSponsor: { name: "ACME Onc" } },
      },
    },
  ],
};

test("buildClinicalTrialsUrl sets term, pageSize, countTotal", () => {
  const url = buildClinicalTrialsUrl({ query: "melanoma", maxResults: 5 });
  assert.match(url, /api\/v2\/studies/);
  assert.match(url, /query\.term=melanoma/);
  assert.match(url, /pageSize=5/);
  assert.match(url, /countTotal=true/);
});

test("buildClinicalTrialsUrl applies a valid status filter (case-insensitive)", () => {
  const url = buildClinicalTrialsUrl({ query: "x", status: "recruiting" });
  assert.match(url, /filter\.overallStatus=RECRUITING/);
});

test("buildClinicalTrialsUrl rejects an unknown status", () => {
  assert.throws(() => buildClinicalTrialsUrl({ query: "x", status: "PENDING" }), /unknown status/);
});

test("parseClinicalTrialsJson flattens the protocol section", () => {
  const { total, results } = parseClinicalTrialsJson(SAMPLE);
  assert.equal(total, 3);
  assert.equal(results[0].nctId, "NCT01234567");
  assert.equal(results[0].title, "A Melanoma Study");
  assert.equal(results[0].status, "RECRUITING");
  assert.deepEqual(results[0].phases, ["PHASE2"]);
  assert.equal(results[0].sponsor, "ACME Onc");
  assert.equal(results[0].url, "https://clinicaltrials.gov/study/NCT01234567");
});

test("parseClinicalTrialsJson tolerates missing studies", () => {
  assert.deepEqual(parseClinicalTrialsJson({}), { total: null, results: [] });
});

test("searchClinicalTrials uses injected fetch", async () => {
  const fetchImpl = async () => new Response(JSON.stringify(SAMPLE), { status: 200 });
  const { results } = await searchClinicalTrials({ query: "melanoma" }, { fetchImpl });
  assert.equal(results[0].nctId, "NCT01234567");
});
