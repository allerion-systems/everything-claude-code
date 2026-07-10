import { test } from "node:test";
import assert from "node:assert/strict";

import { fetchText, fetchJson } from "../src/http.js";

test("fetchText returns the body on 2xx", async () => {
  const fetchImpl = async () => new Response("hello", { status: 200 });
  assert.equal(await fetchText("https://example.com", { fetchImpl }), "hello");
});

test("fetchText throws a compact error on non-2xx", async () => {
  const fetchImpl = async () => new Response("boom details", { status: 503 });
  await assert.rejects(
    () => fetchText("https://example.com/api", { fetchImpl }),
    /HTTP 503 from example\.com: boom details/,
  );
});

test("fetchText sends a User-Agent header", async () => {
  let seenUA = null;
  const fetchImpl = async (_url, init) => {
    seenUA = init.headers["User-Agent"];
    return new Response("ok", { status: 200 });
  };
  await fetchText("https://example.com", { fetchImpl });
  assert.match(seenUA, /science-mcp/);
});

test("fetchJson parses JSON bodies", async () => {
  const fetchImpl = async () => new Response(JSON.stringify({ a: 1 }), { status: 200 });
  assert.deepEqual(await fetchJson("https://example.com", { fetchImpl }), { a: 1 });
});

test("fetchJson throws on invalid JSON", async () => {
  const fetchImpl = async () => new Response("<html/>", { status: 200 });
  await assert.rejects(() => fetchJson("https://example.com", { fetchImpl }), /Invalid JSON/);
});

test("fetchText surfaces a timeout as a readable error", async () => {
  const fetchImpl = (_url, init) =>
    new Promise((_resolve, reject) => {
      init.signal.addEventListener("abort", () => {
        reject(Object.assign(new Error("aborted"), { name: "AbortError" }));
      });
    });
  await assert.rejects(
    () => fetchText("https://slow.example.com", { fetchImpl, timeoutMs: 10 }),
    /timed out after 10ms/,
  );
});
