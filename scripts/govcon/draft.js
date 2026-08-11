#!/usr/bin/env node
// Proposal draft scaffolder. Pulls a SAM.gov notice and renders a pursuit
// workspace: proposal.md pre-filled with the notice's facts, a compliance
// matrix to complete from the solicitation documents, and a pricing worksheet
// wired to market.js comps. The scaffold marks every judgment call as TODO —
// a human (or Claude in session, reviewed by a human) writes the prose, and
// only a human ever certifies or submits.
//
// Usage:
//   node scripts/govcon/draft.js --id <noticeId> --entity allerion-tech

const path = require('path');
const fs = require('fs');
const { samDetail, repoRoot, readJson } = require('./lib');

const args = process.argv.slice(2);
function opt(name) {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? args[i + 1] : null;
}

async function main() {
  const id = opt('id');
  const entityId = opt('entity');
  if (!id || !entityId) {
    console.error('usage: draft.js --id <noticeId> --entity <entityId>');
    process.exit(2);
  }
  const { entities } = readJson(path.join(__dirname, 'entities.json'), { entities: [] });
  const entity = entities.find((e) => e.id === entityId);
  if (!entity) {
    console.error(`unknown entity "${entityId}" — ids: ${entities.map((e) => e.id).join(', ')}`);
    process.exit(2);
  }

  const n = await samDetail(id);
  const slug = (n.solicitationNumber || id).replace(/[^A-Za-z0-9.-]+/g, '_');
  const dir = path.join(repoRoot(), 'govcon', 'pursuits', `${slug}-${entity.id}`);
  fs.mkdirSync(dir, { recursive: true });

  const md = `# Proposal Draft — ${n.title}

> **DRAFT — internal working copy. Not submitted. A human must verify every
> fact, complete every certification, and personally submit. Pricing in this
> file is strategy-sensitive: keep out of public repos (govcon/pursuits/ is
> gitignored by default).**

## Opportunity Facts

| Field | Value |
|-------|-------|
| Solicitation # | ${n.solicitationNumber || 'n/a'} |
| Notice type | ${n.type} |
| Set-aside | ${n.setAsideLabel} (${n.setAside || 'none'}) |
| NAICS | ${n.naics} |
| PSC | ${n.psc} |
| Response deadline | ${n.responseDeadline || 'CHECK NOTICE'} |
| Place of performance | ${n.placeOfPerformance || 'see notice'} |
| Contracting POC | ${n.pointOfContact || 'see notice'} |
| Notice | ${n.url} |

## Bidding Entity

| Field | Value |
|-------|-------|
| Entity | ${entity.name} |
| UEI | ${entity.uei || 'TODO — SAM must be Active before offer (FAR 52.204-7)'} |
| CAGE | ${entity.cage || 'TODO'} |
| Set-aside eligibility for this notice | ${entity.setAsideEligible.includes(n.setAside) ? 'ELIGIBLE (verify)' : 'NOT ELIGIBLE — STOP'} |

## Requirement Summary (from notice)

${n.description || '_No description text on notice — read attached solicitation documents._'}

## Compliance Matrix

Read the actual solicitation attachments on the notice page and list every
"shall" / instruction-to-offerors item here. An offer that misses one is
thrown out unread.

| # | Requirement (quote it) | Where we answer it | Done |
|---|------------------------|--------------------|------|
| 1 | TODO | | [ ] |

## Technical Approach

TODO — write to the evaluation factors, not to what we find interesting.
For a product buy: named product (or "equal" with spec-by-spec equivalence),
delivery timeline, warranty. For services: who, how, where, past performance.

## Past Performance

TODO — cite comparable work. New entity with none: say so plainly and lean on
key-person experience; never invent.

## Pricing Worksheet (INTERNAL ONLY)

Run market comps first:
\`node scripts/govcon/market.js --naics ${n.naics || 'CODE'} --keyword "TODO" --md\`

| Line | Item | Qty | Unit cost (sourced quote) | Unit price | Ext price |
|------|------|-----|---------------------------|------------|-----------|
| 0001 | TODO | | | | |

- Sourcing quote in hand and in writing? [ ]
- Shipping/freight included? [ ]
- Margin vs. market median: TODO
- Nonmanufacturer rule check (product set-asides): [ ]

## Submission Checklist

- [ ] SAM registration ACTIVE for ${entity.name}
- [ ] Reps & certs current in SAM
- [ ] Every compliance-matrix row answered
- [ ] Quote/proposal in the exact format Section L (or the notice) demands
- [ ] Submitted by the human owner to the POC before ${n.responseDeadline || 'the deadline'}
`;

  const file = path.join(dir, 'proposal.md');
  fs.writeFileSync(file, md);
  console.log(`wrote ${path.relative(repoRoot(), file)}`);
}

main().catch((err) => { console.error(err); process.exit(1); });
