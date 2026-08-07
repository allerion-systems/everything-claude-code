#!/usr/bin/env node
/**
 * Seed the Brain into a Claude memory store so every Agency specialist shares it.
 *
 * Walks ../brain/ for Markdown notes, creates (or reuses) a memory store, and writes one
 * memory per note keyed by its vault-relative path. Prints the store ID for mcp/.env
 * (RB_BRAIN_MEMORY_STORE_ID) and agency sessions.
 *
 * Usage (from mcp/, after `npm install`):
 *   ANTHROPIC_API_KEY=sk-ant-...  node scripts/seed-brain.mjs
 *   # reuse / update an existing store:
 *   RB_BRAIN_MEMORY_STORE_ID=memstore_... node scripts/seed-brain.mjs
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";
import Anthropic from "@anthropic-ai/sdk";

const here = fileURLToPath(new URL(".", import.meta.url));
const BRAIN_DIR = join(here, "..", "..", "brain");

function walk(dir) {
  const out = [];
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) out.push(...walk(p));
    else if (name.endsWith(".md")) out.push(p);
  }
  return out;
}

const client = new Anthropic(); // reads ANTHROPIC_API_KEY

let storeId = process.env.RB_BRAIN_MEMORY_STORE_ID;
if (!storeId) {
  const store = await client.beta.memoryStores.create({
    name: "RB-OS Brain",
    description:
      "R&B Roofing & Remodeling's shared knowledge graph: company, applications " +
      "(the lead-to-cash pipeline), agents, concepts, and roles. Check before starting any task.",
  });
  storeId = store.id;
  console.log(`Created memory store: ${storeId}`);
} else {
  console.log(`Reusing memory store: ${storeId}`);
}

const files = walk(BRAIN_DIR);
let written = 0;
for (const file of files) {
  const path = "/" + relative(BRAIN_DIR, file).split(sep).join("/");
  const content = readFileSync(file, "utf8");
  try {
    await client.beta.memoryStores.memories.create(storeId, { path, content });
    written++;
    console.log(`  + ${path}`);
  } catch (err) {
    // Path already exists → update it in place by listing + matching, or just report.
    const msg = err instanceof Error ? err.message : String(err);
    console.log(`  ! ${path} — ${msg} (skipped; delete to re-seed)`);
  }
}

console.log(`\nSeeded ${written}/${files.length} notes.`);
console.log(`Add to mcp/.env:\n  RB_BRAIN_MEMORY_STORE_ID=${storeId}`);
