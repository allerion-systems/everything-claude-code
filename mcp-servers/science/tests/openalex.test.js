import { test } from "node:test";
import assert from "node:assert/strict";

import { buildOpenAlexUrl, parseOpenAlexJson, searchOpenAlex } from "../src/sources/openalex.js";

const SAMPLE = {
  meta: { count: 5000 },
  results: [
    {
      id: "https://openalex.org/W2741809807",
      doi: "https://doi.org/10.7717/peerj.4375",
      display_name: "The state of OA",
      publication_year: 2018,
      cited_by_count: 900,
      authorships: [
        { author: { display_name: "Heather Piwowar" } },
        { author: { display_name: "Jason Priem" } },
      ],
      primary_location: { source: { display_name: "PeerJ" } },
      open_access: { oa_url: "https://peerj.com/articles/4375.pdf" },
    },
  ],
};

test("buildOpenAlexUrl sets search and per_page", () => {
  const url = buildOpenAlexUrl({ query: "open access", maxResults: 3 });
  assert.match(url, /api\.openalex\.org\/works/);
  assert.match(url, /search=open\+access|search=open%20access/);
  assert.match(url, /per_page=3/);
});

test("parseOpenAlexJson normalizes works", () => {
  const { count, results } = parseOpenAlexJson(SAMPLE);
  assert.equal(count, 5000);
  assert.equal(results[0].title, "The state of OA");
  assert.equal(results[0].year, 2018);
  assert.equal(results[0].citations, 900);
  assert.deepEqual(results[0].authors, ["Heather Piwowar", "Jason Priem"]);
  assert.equal(results[0].venue, "PeerJ");
  assert.equal(results[0].openAccessUrl, "https://peerj.com/articles/4375.pdf");
});

test("parseOpenAlexJson tolerates missing results", () => {
  assert.deepEqual(parseOpenAlexJson({}), { count: null, results: [] });
});

test("searchOpenAlex uses injected fetch", async () => {
  const fetchImpl = async () => new Response(JSON.stringify(SAMPLE), { status: 200 });
  const { results } = await searchOpenAlex({ query: "x" }, { fetchImpl });
  assert.equal(results[0].venue, "PeerJ");
});
