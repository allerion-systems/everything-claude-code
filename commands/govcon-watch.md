---
description: Run the daily GovCon pipeline - sweep SAM.gov for each entity, study market comps, scaffold proposal drafts for the strongest fits
---

# /govcon-watch

Run the multi-entity federal opportunity pipeline. Load `skills/govcon-pipeline/SKILL.md` first for bid/no-bid judgment and pricing method.

## Steps

1. **Sweep.** `node scripts/govcon/watch.js` — writes `govcon/digests/<today>.md` and updates `govcon/seen.json`. Add `--entity <id>` to scope to one entity, `--dry` to preview without writing state.
2. **Read the digest.** Focus on rows marked **NEW**. Discard anything failing the skill's bid/no-bid gates (set-aside eligibility, deadline reachability, capability fit).
3. **Study the market** for each surviving candidate: `node scripts/govcon/market.js --naics <code> --keyword "<term>" --md` — win-price range, median, and repeat winners. A market owned by one incumbent at 5x our price point is a no-bid signal.
4. **Scaffold pursuits** for the top fits (max ~3 per entity per day): `node scripts/govcon/draft.js --id <noticeId> --entity <entityId>` — creates `govcon/pursuits/<sol>-<entity>/proposal.md`.
5. **Draft the prose.** Fill the technical approach and compliance matrix in each proposal.md from the notice description and attachments. Leave pricing cells for the human unless sourcing quotes exist.
6. **Commit** digests and seen-state (public data). Do NOT commit `govcon/pursuits/` — it is gitignored because pricing strategy must not live in a public repo.
7. **Report.** Summarize top pursuits per entity with deadlines and what the human must do next (sourcing quotes, eligibility verification, submission).

## Hard rules

- Never submit anything to SAM.gov or a contracting officer; a human submits.
- Never claim a certification (SDVOSB, 8(a), WOSB…) an entity does not hold — check `scripts/govcon/entities.json` `setAsideEligible`.
- Offers require the entity's SAM registration to be Active (FAR 52.204-7).
