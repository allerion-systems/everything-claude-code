---
description: Run the GovCon team end to end - hunt opportunities, analyze the best, and build submission-ready quote packages (humans submit)
---

# /govcon — Federal Contracting Team

Run the Allerion GovCon agent team as a pipeline. Read
`skills/govcon-pipeline/SKILL.md` first — its gates and hard rules bind every
stage. Arguments: `$ARGUMENTS` (optional — a solicitation number or SAM.gov
notice id to skip straight to analysis; a lane keyword to focus the hunt).

## Pipeline

1. **Hunt** — delegate to `govcon-crumbs-hunter`: sweep via
   `scripts/govcon/watch.js`, score the digest, shortlist 3–5 winnable
   product-supply targets with market comps.
2. **Analyze** — for each shortlisted target (or the one in `$ARGUMENTS`),
   delegate to `govcon-solicitation-analyst`: pull the real attachments,
   extract requirements, build the compliance matrix and evaluation-factor
   map, run bid/no-bid gates, issue GO or NO-BID.
3. **Close** — for each GO, delegate to `govcon-proposal-closer`: build the
   quote package from the compliance matrix, flag exactly which supplier
   quotes are missing, and produce the submission checklist.
4. **Report** — one consolidated brief: shortlist table (deadline, set-aside,
   verdict), packages ready vs. blocked on supplier pricing, and the human
   action list in deadline order.

## Hard rules (repeat at every stage)

- Nothing is EVER submitted to SAM.gov or a contracting officer by an agent —
  a human sends every quote.
- Never claim certifications an entity lacks; entity truth lives in
  `scripts/govcon/entities.json`.
- `govcon/pursuits/` is gitignored (pricing strategy, public repo) — commit
  only digests and seen.json.
