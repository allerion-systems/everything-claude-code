# GovCon Workspace

Working data for the multi-entity federal opportunity pipeline
(`skills/govcon-pipeline`, `/govcon-watch`, `scripts/govcon/`).

- `digests/` — dated markdown digests from the daily SAM.gov sweep (public
  data, committed)
- `seen.json` — dedupe state so reruns only flag what's new (committed)
- `pursuits/` — per-opportunity proposal workspaces (**gitignored**: contains
  pricing strategy; never commit from a public repository)

Entity profiles live in `scripts/govcon/entities.json`. Run the pipeline with
`/govcon-watch` or directly:

```bash
node scripts/govcon/watch.js            # daily sweep -> digest
node scripts/govcon/market.js --naics 561730 --keyword "land clearing"
node scripts/govcon/draft.js --id <noticeId> --entity allerion-tech
```
