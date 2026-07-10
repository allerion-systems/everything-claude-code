import { test } from "node:test";
import assert from "node:assert/strict";

import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";

import { createServer } from "../src/server.js";

const ARXIV_XML = `<feed xmlns="http://www.w3.org/2005/Atom">
  <entry>
    <id>http://arxiv.org/abs/1706.03762v7</id>
    <published>2017-06-12T17:57:34Z</published>
    <updated>2017-06-12T17:57:34Z</updated>
    <title>Attention Is All You Need</title>
    <summary>We propose the Transformer.</summary>
    <author><name>Ashish Vaswani</name></author>
    <link title="pdf" href="http://arxiv.org/pdf/1706.03762v7" rel="related" type="application/pdf"/>
    <category term="cs.CL"/>
  </entry>
</feed>`;

/**
 * Connect an in-memory client to a server built with the given fetch stub.
 * @param {typeof fetch} fetchImpl
 */
async function connect(fetchImpl) {
  const server = createServer({ fetchImpl });
  const client = new Client({ name: "test", version: "0.0.0" });
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  await Promise.all([server.connect(serverTransport), client.connect(clientTransport)]);
  return { client, server };
}

test("server registers the six science tools", async () => {
  const { client } = await connect(async () => new Response("", { status: 200 }));
  const { tools } = await client.listTools();
  const names = tools.map((t) => t.name).sort();
  assert.deepEqual(names, [
    "arxiv_search",
    "clinical_trials_search",
    "crossref_doi",
    "openalex_search",
    "pubchem_compound",
    "pubmed_search",
  ]);
});

test("arxiv_search returns a formatted text result end-to-end", async () => {
  const { client } = await connect(async () => new Response(ARXIV_XML, { status: 200 }));
  const result = await client.callTool({ name: "arxiv_search", arguments: { query: "all:transformer" } });
  assert.equal(result.isError, undefined);
  const text = result.content[0].text;
  assert.match(text, /Attention Is All You Need/);
  assert.match(text, /Ashish Vaswani/);
});

test("a tool surfaces upstream failures as an MCP error result", async () => {
  const { client } = await connect(async () => new Response("upstream down", { status: 500 }));
  const result = await client.callTool({ name: "openalex_search", arguments: { query: "x" } });
  assert.equal(result.isError, true);
  assert.match(result.content[0].text, /Error: HTTP 500/);
});

test("invalid arguments are rejected by the input schema", async () => {
  const { client } = await connect(async () => new Response(ARXIV_XML, { status: 200 }));
  const result = await client.callTool({ name: "arxiv_search", arguments: { query: "" } });
  assert.equal(result.isError, true);
  assert.match(result.content[0].text, /validation error/i);
});
