import { test } from "node:test";
import assert from "node:assert/strict";

import {
  buildEsearchUrl,
  parseEsearchJson,
  buildEsummaryUrl,
  parseEsummaryJson,
  searchPubmed,
} from "../src/sources/pubmed.js";

const ESEARCH = {
  esearchresult: { count: "42", idlist: ["11111", "22222"] },
};

const ESUMMARY = {
  result: {
    uids: ["11111"],
    "11111": {
      uid: "11111",
      title: "A study of CRISPR.",
      fulljournalname: "Nature",
      pubdate: "2023 Jan 1",
      authors: [{ name: "Doe J" }, { name: "Roe R" }],
      articleids: [{ idtype: "doi", value: "10.1038/s41586-023-00001" }],
    },
  },
};

test("buildEsearchUrl sets db, retmax, and identity params", () => {
  const url = buildEsearchUrl({ query: "CRISPR", maxResults: 5 });
  assert.match(url, /esearch\.fcgi/);
  assert.match(url, /db=pubmed/);
  assert.match(url, /term=CRISPR/);
  assert.match(url, /retmax=5/);
  assert.match(url, /tool=science-mcp/);
});

test("parseEsearchJson pulls count and ids", () => {
  assert.deepEqual(parseEsearchJson(ESEARCH), { count: 42, ids: ["11111", "22222"] });
});

test("parseEsearchJson tolerates missing result", () => {
  assert.deepEqual(parseEsearchJson({}), { count: 0, ids: [] });
});

test("buildEsummaryUrl requires ids", () => {
  assert.throws(() => buildEsummaryUrl({ ids: [] }), /ids are required/);
});

test("parseEsummaryJson maps record with doi", () => {
  const [r] = parseEsummaryJson(ESUMMARY);
  assert.equal(r.pmid, "11111");
  assert.equal(r.title, "A study of CRISPR.");
  assert.equal(r.journal, "Nature");
  assert.deepEqual(r.authors, ["Doe J", "Roe R"]);
  assert.equal(r.doi, "10.1038/s41586-023-00001");
  assert.equal(r.url, "https://pubmed.ncbi.nlm.nih.gov/11111/");
});

test("searchPubmed short-circuits on zero ids without a second call", async () => {
  let calls = 0;
  const fetchImpl = async () => {
    calls += 1;
    return new Response(JSON.stringify({ esearchresult: { count: "0", idlist: [] } }), { status: 200 });
  };
  const out = await searchPubmed({ query: "nothing" }, { fetchImpl });
  assert.deepEqual(out, { count: 0, results: [] });
  assert.equal(calls, 1);
});

test("searchPubmed chains esearch then esummary", async () => {
  const fetchImpl = async (url) => {
    const body = String(url).includes("esearch") ? ESEARCH : ESUMMARY;
    return new Response(JSON.stringify(body), { status: 200 });
  };
  const out = await searchPubmed({ query: "CRISPR" }, { fetchImpl });
  assert.equal(out.count, 42);
  assert.equal(out.results[0].pmid, "11111");
});
