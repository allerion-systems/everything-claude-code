# Science MCP Server

A [Model Context Protocol](https://modelcontextprotocol.io) server that gives an
AI assistant read access to major scientific literature and data sources. Every
tool is backed by a **free, public API that needs no API key** — so the server
runs with zero configuration.

Think of it as a research librarian your agent can call: hand it a topic, a
compound, or a DOI, and it comes back with structured results from the right
catalogue.

## Tools

| Tool | Source | What it does |
|---|---|---|
| `arxiv_search` | [arXiv](https://info.arxiv.org/help/api/) | Search preprints (physics, math, CS, quant-bio, …) with arXiv query syntax |
| `pubmed_search` | [NCBI PubMed](https://www.ncbi.nlm.nih.gov/books/NBK25501/) | Search biomedical and life-sciences literature |
| `pubchem_compound` | [PubChem](https://pubchem.ncbi.nlm.nih.gov/docs/pug-rest) | Resolve a compound by name or CID → formula, weight, IUPAC, SMILES, InChIKey, XLogP |
| `clinical_trials_search` | [ClinicalTrials.gov v2](https://clinicaltrials.gov/data-api/api) | Search the registry of clinical studies, optionally by status |
| `crossref_doi` | [CrossRef](https://api.crossref.org) | Resolve a DOI → title, authors, journal, publisher, date, citation count |
| `openalex_search` | [OpenAlex](https://docs.openalex.org) | Broad cross-discipline scholarly search with citation counts and open-access links |

## Install & run

Requires Node.js 18+ (uses the built-in global `fetch`).

```bash
cd mcp-servers/science
npm install
npm start          # launches the stdio server
npm test           # runs the offline unit + integration suite (no network)
```

## Configure your MCP client

Point any MCP client at the entrypoint over stdio. For Claude Code / Claude
Desktop, add this to your `mcpServers` config (adjust the absolute path):

```json
{
  "mcpServers": {
    "science": {
      "command": "node",
      "args": ["/absolute/path/to/mcp-servers/science/src/index.js"]
    }
  }
}
```

The same entry (with a placeholder path) lives in the repo's
[`mcp-configs/mcp-servers.json`](../../mcp-configs/mcp-servers.json).

## Optional environment variables

| Variable | Effect |
|---|---|
| `SCIENCE_MCP_CONTACT_EMAIL` | Adds your email to CrossRef/OpenAlex requests (their faster "polite pool") and to NCBI requests. |
| `NCBI_API_KEY` | Raises the PubMed/NCBI E-utilities rate limit from 3 to 10 requests/second. |

Both are optional — the server works without them. Note that anonymous OpenAlex
requests share a daily budget per source IP and may occasionally return
`HTTP 429`; setting a contact email routes you into the polite pool.

## Architecture

- **`src/http.js`** — the only module that touches the network. Adds a
  User-Agent, applies a timeout, and normalizes errors.
- **`src/sources/*.js`** — one module per API. Each exposes a pure
  `build…Url(...)`, a pure `parse…(...)`, and a thin `async` function that wires
  them together with an **injectable `fetchImpl`**. This split is what makes the
  parsers unit-testable offline against fixtures.
- **`src/server.js`** — registers the six tools on an `McpServer`, transport
  agnostic. Handlers are wrapped so upstream failures return a clean MCP error
  result instead of crashing the transport.
- **`src/index.js`** — the entrypoint; connects the server over stdio.

## Tests

`npm test` runs `node --test` over `tests/`. The suite is fully offline: source
parsers are checked against captured API fixtures, and the server is exercised
end-to-end through an in-memory transport with a stubbed `fetch` — covering tool
registration, a successful call, upstream-error handling, and input-schema
validation.
