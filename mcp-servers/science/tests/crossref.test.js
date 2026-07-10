import { test } from "node:test";
import assert from "node:assert/strict";

import {
  normalizeDoi,
  buildCrossrefWorkUrl,
  parseCrossrefWork,
  resolveDoi,
} from "../src/sources/crossref.js";

const SAMPLE = {
  message: {
    DOI: "10.1038/nphys1170",
    title: ["Measurement of the something"],
    author: [
      { given: "Ada", family: "Lovelace" },
      { given: "Alan", family: "Turing" },
    ],
    "container-title": ["Nature Physics"],
    publisher: "Springer",
    type: "journal-article",
    issued: { "date-parts": [[2009, 1, 15]] },
    "is-referenced-by-count": 123,
    URL: "https://doi.org/10.1038/nphys1170",
  },
};

test("normalizeDoi strips url and doi: prefixes", () => {
  assert.equal(normalizeDoi("https://doi.org/10.1038/nphys1170"), "10.1038/nphys1170");
  assert.equal(normalizeDoi("doi:10.1038/nphys1170"), "10.1038/nphys1170");
  assert.equal(normalizeDoi("10.1038/nphys1170"), "10.1038/nphys1170");
});

test("normalizeDoi rejects a non-DOI", () => {
  assert.throws(() => normalizeDoi("not-a-doi"), /does not look like a DOI/);
});

test("buildCrossrefWorkUrl targets the works endpoint", () => {
  const url = buildCrossrefWorkUrl("10.1038/nphys1170");
  assert.match(url, /api\.crossref\.org\/works\/10\.1038/);
});

test("parseCrossrefWork normalizes metadata", () => {
  const w = parseCrossrefWork(SAMPLE);
  assert.equal(w.doi, "10.1038/nphys1170");
  assert.equal(w.title, "Measurement of the something");
  assert.deepEqual(w.authors, ["Ada Lovelace", "Alan Turing"]);
  assert.equal(w.journal, "Nature Physics");
  assert.equal(w.published, "2009-01-15");
  assert.equal(w.citations, 123);
});

test("parseCrossrefWork returns null without a DOI", () => {
  assert.equal(parseCrossrefWork({ message: {} }), null);
});

test("resolveDoi uses injected fetch", async () => {
  const fetchImpl = async () => new Response(JSON.stringify(SAMPLE), { status: 200 });
  const w = await resolveDoi("10.1038/nphys1170", { fetchImpl });
  assert.equal(w.journal, "Nature Physics");
});
