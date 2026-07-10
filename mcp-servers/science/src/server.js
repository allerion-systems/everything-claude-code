// Science MCP server — registers research tools backed by free, no-auth public APIs.
//
// Transport-agnostic: this module only builds and returns the McpServer. The
// entrypoint (index.js) owns the transport so the same server can run over
// stdio locally or a different transport elsewhere.

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

import { searchArxiv } from "./sources/arxiv.js";
import { searchPubmed } from "./sources/pubmed.js";
import { getPubchemCompound } from "./sources/pubchem.js";
import { searchClinicalTrials } from "./sources/clinicaltrials.js";
import { resolveDoi } from "./sources/crossref.js";
import { searchOpenAlex } from "./sources/openalex.js";

export const SERVER_NAME = "science-mcp";
export const SERVER_VERSION = "0.1.0";

const maxResults = z
  .number()
  .int()
  .min(1)
  .max(50)
  .optional()
  .describe("Maximum number of results (1-50, default 10)");

/**
 * Build the Science MCP server with all tools registered.
 * @param {{ fetchImpl?: typeof fetch }} [deps] injectable fetch, for tests
 * @returns {McpServer}
 */
export function createServer(deps = {}) {
  const server = new McpServer({ name: SERVER_NAME, version: SERVER_VERSION });
  const run = (fn) => guard(fn);

  server.registerTool(
    "arxiv_search",
    {
      title: "Search arXiv",
      description:
        "Search arXiv preprints (physics, math, CS, quantitative biology, and more). " +
        "Use arXiv query syntax, e.g. 'all:graphene', 'ti:transformer AND cat:cs.LG', 'au:hinton'.",
      inputSchema: {
        query: z.string().min(1).describe("arXiv search query (supports field prefixes like ti:, au:, cat:)"),
        max_results: maxResults,
        sort_by: z
          .enum(["relevance", "lastUpdatedDate", "submittedDate"])
          .optional()
          .describe("Sort order (default relevance)"),
      },
    },
    run(async ({ query, max_results, sort_by }) => {
      const papers = await searchArxiv({ query, maxResults: max_results, sortBy: sort_by }, deps);
      return renderList(`arXiv results for "${query}"`, papers, (p) =>
        [
          `**${p.title}**`,
          p.authors.length ? `by ${p.authors.join(", ")}` : "",
          p.published ? `published ${p.published.slice(0, 10)}` : "",
          p.categories.length ? `categories: ${p.categories.join(", ")}` : "",
          truncate(p.summary, 400),
          p.pdfUrl || p.id,
        ]);
    }),
  );

  server.registerTool(
    "pubmed_search",
    {
      title: "Search PubMed",
      description:
        "Search PubMed for biomedical and life-sciences literature. " +
        "Supports PubMed query syntax, e.g. 'CRISPR[Title] AND 2023[PDAT]'.",
      inputSchema: {
        query: z.string().min(1).describe("PubMed search query"),
        max_results: maxResults,
      },
    },
    run(async ({ query, max_results }) => {
      const { count, results } = await searchPubmed({ query, maxResults: max_results }, deps);
      return renderList(`PubMed results for "${query}" (${count} total matches)`, results, (r) =>
        [
          `**${r.title}**`,
          r.authors.length ? `${r.authors.slice(0, 6).join(", ")}${r.authors.length > 6 ? " et al." : ""}` : "",
          [r.journal, r.pubdate].filter(Boolean).join(", "),
          r.doi ? `doi:${r.doi}` : "",
          `PMID ${r.pmid} — ${r.url}`,
        ]);
    }),
  );

  server.registerTool(
    "pubchem_compound",
    {
      title: "Look up a PubChem compound",
      description:
        "Resolve a chemical compound by name or PubChem CID and return its formula, " +
        "molecular weight, IUPAC name, canonical SMILES, InChIKey, and XLogP.",
      inputSchema: {
        name: z.string().optional().describe("Compound name, e.g. 'aspirin' or 'caffeine'"),
        cid: z.number().int().positive().optional().describe("PubChem Compound ID (CID)"),
      },
    },
    run(async ({ name, cid }) => {
      const c = await getPubchemCompound({ name, cid }, deps);
      if (!c) return textResult(`No PubChem compound found for ${name ? `"${name}"` : `CID ${cid}`}.`);
      const lines = [
        `**PubChem CID ${c.cid}**`,
        c.iupacName ? `IUPAC name: ${c.iupacName}` : "",
        c.formula ? `Formula: ${c.formula}` : "",
        c.molecularWeight ? `Molecular weight: ${c.molecularWeight} g/mol` : "",
        c.xLogP != null ? `XLogP: ${c.xLogP}` : "",
        c.smiles ? `SMILES: ${c.smiles}` : "",
        c.inchiKey ? `InChIKey: ${c.inchiKey}` : "",
        c.url,
      ].filter(Boolean);
      return textResult(lines.join("\n"));
    }),
  );

  server.registerTool(
    "clinical_trials_search",
    {
      title: "Search ClinicalTrials.gov",
      description:
        "Search the ClinicalTrials.gov v2 registry of clinical studies by condition, " +
        "intervention, or free text, optionally filtered by recruitment status.",
      inputSchema: {
        query: z.string().min(1).describe("Search terms, e.g. 'melanoma pembrolizumab'"),
        max_results: maxResults,
        status: z
          .string()
          .optional()
          .describe("Optional overall-status filter, e.g. RECRUITING, COMPLETED, TERMINATED"),
      },
    },
    run(async ({ query, max_results, status }) => {
      const { total, results } = await searchClinicalTrials({ query, maxResults: max_results, status }, deps);
      const header = `ClinicalTrials.gov results for "${query}"${total != null ? ` (${total} total)` : ""}`;
      return renderList(header, results, (t) =>
        [
          `**${t.title}**`,
          t.status ? `status: ${t.status}` : "",
          t.phases.length ? `phase: ${t.phases.join(", ")}` : "",
          t.conditions.length ? `conditions: ${t.conditions.slice(0, 5).join(", ")}` : "",
          t.sponsor ? `sponsor: ${t.sponsor}` : "",
          `${t.nctId} — ${t.url}`,
        ]);
    }),
  );

  server.registerTool(
    "crossref_doi",
    {
      title: "Resolve a DOI (CrossRef)",
      description:
        "Resolve a DOI to structured citation metadata via CrossRef: title, authors, " +
        "journal, publisher, publication date, and citation count.",
      inputSchema: {
        doi: z.string().min(1).describe("A DOI, with or without the https://doi.org/ prefix"),
      },
    },
    run(async ({ doi }) => {
      const work = await resolveDoi(doi, deps);
      if (!work) return textResult(`No CrossRef record found for "${doi}".`);
      const lines = [
        `**${work.title || "(untitled)"}**`,
        work.authors.length ? `Authors: ${work.authors.join(", ")}` : "",
        work.journal ? `Journal: ${work.journal}` : "",
        work.publisher ? `Publisher: ${work.publisher}` : "",
        work.type ? `Type: ${work.type}` : "",
        work.published ? `Published: ${work.published}` : "",
        `Cited by: ${work.citations}`,
        `doi:${work.doi} — ${work.url}`,
      ].filter(Boolean);
      return textResult(lines.join("\n"));
    }),
  );

  server.registerTool(
    "openalex_search",
    {
      title: "Search OpenAlex",
      description:
        "Search OpenAlex, an open index of scholarly works across all disciplines. " +
        "Good for cross-field literature discovery with citation counts and open-access links.",
      inputSchema: {
        query: z.string().min(1).describe("Free-text search across titles, abstracts, and full text"),
        max_results: maxResults,
      },
    },
    run(async ({ query, max_results }) => {
      const { count, results } = await searchOpenAlex({ query, maxResults: max_results }, deps);
      const header = `OpenAlex results for "${query}"${count != null ? ` (${count} total)` : ""}`;
      return renderList(header, results, (w) =>
        [
          `**${w.title}**`,
          w.authors.length ? `${w.authors.slice(0, 6).join(", ")}${w.authors.length > 6 ? " et al." : ""}` : "",
          [w.venue, w.year].filter(Boolean).join(", "),
          `cited by ${w.citations}`,
          w.doi ? `doi:${w.doi.replace(/^https?:\/\/doi\.org\//i, "")}` : "",
          w.openAccessUrl || w.id,
        ]);
    }),
  );

  return server;
}

// --- result formatting ---

/**
 * Wrap a tool handler so thrown errors become MCP error results instead of
 * crashing the transport.
 * @param {(args: any) => Promise<{content: any[]}>} handler
 */
function guard(handler) {
  return async (args) => {
    try {
      return await handler(args);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return { content: [{ type: "text", text: `Error: ${message}` }], isError: true };
    }
  };
}

/** @param {string} text */
function textResult(text) {
  return { content: [{ type: "text", text }] };
}

/**
 * Render a header plus a numbered list of records into a single text block.
 * @template T
 * @param {string} header
 * @param {T[]} items
 * @param {(item: T) => string[]} toLines maps a record to display lines (falsy lines dropped)
 */
function renderList(header, items, toLines) {
  if (!items || items.length === 0) return textResult(`${header}\n\nNo results.`);
  const blocks = items.map((item, i) => {
    const lines = toLines(item).filter(Boolean);
    return `${i + 1}. ${lines.join("\n   ")}`;
  });
  return textResult(`${header}\n\n${blocks.join("\n\n")}`);
}

/** @param {string} value @param {number} max */
function truncate(value, max) {
  if (!value) return "";
  return value.length > max ? `${value.slice(0, max)}…` : value;
}
