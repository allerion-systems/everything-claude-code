# Allerion Brain

Your digital second brain — a git-tracked, markdown-native knowledge base that
**you** (jallee) and **any agent** (Claude Code, NanoClaw / `npm run claw`, or a
local model on your Mac) can read, search, and act on.

It is the bedrock. Everything else — estimating help at R&B, Allerion's products,
content, automations — reads from here.

## Why markdown + git (not a black-box app)

- **An agent can read it directly.** No API, no vendor lock, no "export" dance.
- **It's portable and durable.** Plain files; works on your Mac, in the cloud, forever.
- **It version-controls.** Every fact has history; nothing silently changes.
- **It already matches your tools.** NanoClaw stores sessions as markdown too, so
  the brain and your agent speak the same format.

## Layout

```
brain/
  README.md            <- you are here
  AGENT.md             <- instructions an agent reads BEFORE acting
  _template.md         <- the note schema
  inbox.md             <- drop links / sources here to be processed
  index.md             <- generated list of every note (npm run brain:index)
  notes/
    roofing/           <- R&B Roofing & Remodeling, estimating, construction
    allerion/          <- Allerion Technologies LLC, products, business
    general/           <- everything else
```

## The loop: link in → context out

1. **Capture.** Paste a YouTube URL (or any source) into `inbox.md`, or run the
   ingester directly.
2. **Ingest.** `npm run brain:ingest -- <youtube-url> --domain roofing`
   pulls the transcript + metadata and writes a raw note.
3. **Enrich.** Ask the agent (or any LLM) to fill in Summary / Key Points /
   Action Items on the raw note — or do it inline during ingestion.
4. **Index.** `npm run brain:index` regenerates `index.md`.
5. **Act.** The agent reads `AGENT.md` + the relevant notes and gets to work
   with your context loaded.

## NotebookLM note

NotebookLM has no public API, so a NotebookLM link can't be auto-pulled. Two
real paths instead:

- Ingest the **source documents** you'd put into NotebookLM (PDFs, articles,
  transcripts) directly into the brain — same knowledge, agent-readable.
- Export/copy NotebookLM output and ingest it as text:
  `npm run brain:ingest -- --title "Roofing margins (NotebookLM)" --file ./export.txt --domain roofing`

## Privacy

This brain touches a real W2 employer (R&B) and your LLC. Keep anything sensitive
(client data, pricing you can't share, contracts) out of any public/pushed repo.
For private material, run the brain in a **private** repository or a local-only
clone. See `AGENT.md` for the handling rules.
