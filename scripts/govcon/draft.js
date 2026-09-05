#!/usr/bin/env node
/**
 * GovCon pursuit scaffolder — fetches one SAM.gov notice and writes a pursuit
 * workup skeleton to govcon/pursuits/<sol>-<entity>.md.
 *
 * govcon/pursuits/ is GITIGNORED on purpose: workups carry pricing strategy
 * and this repository is public. Never commit pursuit files.
 *
 * Usage: node scripts/govcon/draft.js --id <noticeId> --entity <entityId>
 * Requires: Node 18+ (global fetch). No dependencies, no API key.
 */

const fs = require('fs');
const path = require('path');
const { detailUrl } = require('./lib');

const args = process.argv.slice(2);
const getArg = (flag) => {
  const i = args.indexOf(flag);
  return i >= 0 ? args[i + 1] : undefined;
};
const noticeId = getArg('--id');
const entityId = getArg('--entity');
if (!noticeId || !entityId) {
  console.error('Usage: node scripts/govcon/draft.js --id <noticeId> --entity <entityId>');
  process.exit(2);
}

const REPO_ROOT = path.resolve(__dirname, '..', '..');
const PURSUITS_DIR = path.join(REPO_ROOT, 'govcon', 'pursuits');
const ENTITIES = JSON.parse(fs.readFileSync(path.join(__dirname, 'entities.json'), 'utf8'));
const HEADERS = { Accept: 'application/hal+json', 'User-Agent': 'Mozilla/5.0' };

const stripHtml = (s) => (s || '').replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();

async function main() {
  const entity = ENTITIES.entities.find((e) => e.id === entityId);
  if (!entity) throw new Error(`Unknown entity "${entityId}" — see scripts/govcon/entities.json`);

  const res = await fetch(detailUrl(noticeId), { headers: HEADERS });
  if (!res.ok) throw new Error(`HTTP ${res.status} fetching notice ${noticeId}`);
  const d = await res.json();
  const data = d.data2 || d.data || {};
  const sol = data.solicitationNumber || noticeId.slice(0, 12);
  const poc = (data.pointOfContact || [])[0] || {};
  const desc = stripHtml((d.description || [])[0]?.body).slice(0, 2000);

  let attachments = [];
  try {
    const r2 = await fetch(`https://sam.gov/api/prod/opps/v3/opportunities/${noticeId}/resources`, { headers: HEADERS });
    if (r2.ok) {
      const rd = await r2.json();
      attachments = (rd._embedded?.opportunityAttachmentList || [])
        .flatMap((a) => a.attachments || [])
        .map((a) => `- ${a.name} — https://sam.gov/api/prod/opps/v3/opportunities/resources/files/${a.resourceId}/download`);
    }
  } catch {
    /* attachments are best-effort */
  }

  fs.mkdirSync(PURSUITS_DIR, { recursive: true });
  const outPath = path.join(PURSUITS_DIR, `${sol.replace(/[^A-Za-z0-9._-]/g, '_')}-${entityId}.md`);
  const body = `# Pursuit — ${data.title || sol}

**Solicitation:** ${sol} · **Entity:** ${entity.name} (${entity.uei || 'UEI pending'})
**Set-aside:** ${data.solicitation?.setAside ?? 'NONE'} · **PSC:** ${data.classificationCode || '?'} · **Due:** ${data.solicitation?.deadlines?.response || '?'}
**POC:** ${poc.fullName || '?'} <${poc.email || '?'}>
**Link:** https://sam.gov/opp/${noticeId}/view

## Requirement summary
${desc || '_Pull from attachments._'}

## Attachments
${attachments.join('\n') || '_None listed._'}

## Gates (complete before pricing — see skills/govcon-pipeline/SKILL.md)
- [ ] Set-aside eligibility confirmed for this entity (no unclaimed certifications)
- [ ] Nonmanufacturer Rule: small-manufacturer source or current SBA class waiver identified
- [ ] Berry Amendment check (DOD clothing/textiles/food/tools only)
- [ ] TAA country-of-origin per line item
- [ ] Delivery terms (FOB), place, and timeline are achievable

## Technical approach

_Fill in from the requirement summary and attachments._

## Pricing (landed cost + margin — never commit this file)
| Line | Item | Qty | Unit cost | Freight | Unit price | Extended |
|---|---|---|---|---|---|---|

## Hard rules
Offers require an ACTIVE SAM registration (FAR 52.204-7). Nothing is submitted
to SAM.gov or a contracting officer by automation — a human sends the quote.
`;
  fs.writeFileSync(outPath, body);
  console.log(`[draft] wrote ${path.relative(REPO_ROOT, outPath)}`);
}

main().catch((err) => {
  console.error(`[draft] fatal: ${err.message}`);
  process.exit(1);
});
