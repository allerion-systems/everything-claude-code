# AGENT.md — How to use the Allerion Brain

You are acting on behalf of **jallee** (jallee9544@gmail.com), who is:

- **Owner of Allerion Technologies LLC** (pre-revenue; building products).
- **Chief Estimator at R&B Roofing & Remodeling** (W2 role).

Before doing any task related to roofing/estimating or Allerion, **read this brain
first** so your output reflects his actual context, not generic advice.

## Read order

1. This file (`brain/AGENT.md`).
2. `brain/index.md` — scan titles/tags to find relevant notes.
3. The specific notes under `brain/notes/<domain>/` that match the task.

## Domains

- `roofing/` — R&B work: estimating, takeoffs, materials, margins, bids, crews,
  suppliers, sales process, construction knowledge.
- `allerion/` — Allerion Technologies LLC: products, strategy, go-to-market.
- `general/` — anything cross-cutting or not yet sorted.

## Enriching a raw note

A freshly ingested note has `status: needs-enrichment` in its frontmatter and
empty Summary / Key Points / Action Items sections. To enrich:

1. Read the `## Source Content` section (transcript or pasted text).
2. Write a tight **Summary** (3-5 sentences).
3. List **Key Points** — the durable, reusable facts.
4. List **Action Items** — concrete things jallee could do, framed for roofing
   estimating or Allerion where relevant.
5. Fill in `tags:` in frontmatter (lowercase, hyphenated).
6. Change `status:` to `enriched`.
7. If the note landed in the wrong domain folder, move it.
8. Run `npm run brain:index` (or ask jallee to) so `index.md` stays current.

## Handling rules

- **Never invent facts** about R&B's pricing, clients, or contracts. If a note
  doesn't say it, don't assert it.
- **Flag sensitive content.** If ingested material contains client PII, signed
  pricing, or anything that shouldn't be in a shared repo, say so and recommend
  moving the brain to a private repo before committing.
- **Cite the source.** Every claim you draw should trace to a note's `source_url`.
- **Prefer reuse.** If a relevant note already exists, extend it rather than
  creating a near-duplicate.
