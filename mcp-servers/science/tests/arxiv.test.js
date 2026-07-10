import { test } from "node:test";
import assert from "node:assert/strict";

import { buildArxivUrl, parseArxivAtom, searchArxiv } from "../src/sources/arxiv.js";

const SAMPLE = `<?xml version="1.0" encoding="UTF-8"?>
<feed xmlns="http://www.w3.org/2005/Atom">
  <entry>
    <id>http://arxiv.org/abs/1706.03762v7</id>
    <updated>2023-08-02T00:41:18Z</updated>
    <published>2017-06-12T17:57:34Z</published>
    <title>Attention Is All You Need</title>
    <summary>  The dominant sequence transduction models are based on complex
recurrent networks &amp; encoders.  </summary>
    <author><name>Ashish Vaswani</name></author>
    <author><name>Noam Shazeer</name></author>
    <link href="http://arxiv.org/abs/1706.03762v7" rel="alternate" type="text/html"/>
    <link title="pdf" href="http://arxiv.org/pdf/1706.03762v7" rel="related" type="application/pdf"/>
    <category term="cs.CL" scheme="http://arxiv.org/schemas/atom"/>
    <category term="cs.LG" scheme="http://arxiv.org/schemas/atom"/>
  </entry>
</feed>`;

test("buildArxivUrl encodes query and clamps max_results", () => {
  const url = buildArxivUrl({ query: "all:transformer", maxResults: 999 });
  assert.match(url, /export\.arxiv\.org\/api\/query/);
  assert.match(url, /search_query=all%3Atransformer/);
  assert.match(url, /max_results=50/); // clamped to 50
});

test("buildArxivUrl rejects empty query", () => {
  assert.throws(() => buildArxivUrl({ query: "  " }), /query is required/);
});

test("parseArxivAtom extracts normalized fields", () => {
  const [paper] = parseArxivAtom(SAMPLE);
  assert.equal(paper.title, "Attention Is All You Need");
  assert.deepEqual(paper.authors, ["Ashish Vaswani", "Noam Shazeer"]);
  assert.deepEqual(paper.categories, ["cs.CL", "cs.LG"]);
  assert.equal(paper.pdfUrl, "http://arxiv.org/pdf/1706.03762v7");
  assert.equal(paper.published, "2017-06-12T17:57:34Z");
  assert.match(paper.summary, /complex recurrent networks & encoders\./); // entity decoded, whitespace collapsed
});

test("searchArxiv uses injected fetch", async () => {
  const fetchImpl = async () => new Response(SAMPLE, { status: 200 });
  const papers = await searchArxiv({ query: "all:transformer" }, { fetchImpl });
  assert.equal(papers.length, 1);
  assert.equal(papers[0].title, "Attention Is All You Need");
});
