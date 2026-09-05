# GovCon Pipeline

Bid/no-bid gates, price-to-win method, and hard rules for the daily federal
opportunity pipeline (scripts/govcon/).

## When to Use

- The daily GovCon watcher routine, or any manual opportunity sweep.
- Before scaffolding or pricing any pursuit for an Allerion entity.

## How It Works

1. `node scripts/govcon/watch.js` — sweeps SAM.gov public data per entity
   profile (`scripts/govcon/entities.json`), writes `govcon/digests/<date>.md`,
   updates `govcon/seen.json`. Digests and seen.json are committable (public
   data). `govcon/pursuits/` is gitignored — pricing strategy never lands in
   this public repo.
2. `node scripts/govcon/market.js --naics <code> --keyword "<term>" --md` —
   award-value comps from USAspending for price-to-win context.
3. `node scripts/govcon/draft.js --id <noticeId> --entity <entityId>` —
   scaffolds a pursuit workup with gates checklist and pricing table.

## Bid/no-bid gates (all must pass)

1. **Eligibility** — entity's SAM registration ACTIVE (FAR 52.204-7) and the
   set-aside matches certifications the entity actually holds. Never claim a
   certification an entity lacks; HAC's SDVOSB status counts only when SBA
   VetCert shows it active.
2. **Deadline reachability** — ≥3 days out AND enough time to get supplier
   quotes (product buys: 2+ days for distributor pricing).
3. **Capability fit** — product-supply (reseller) lanes prefer notice types
   o/k with clear specs. No manufacturing, no construction labor unless the
   entity profile says otherwise.
4. **Nonmanufacturer Rule** (set-aside supply buys > micro-purchase): supply a
   small US manufacturer's product or confirm a current SBA class waiver for
   the item. No source and no waiver → no-bid.
5. **Berry Amendment** (DOD clothing/textiles/food/hand tools): 100% US-made
   down to components. Imported PPE to DOD is an automatic no-bid.
6. **TAA** — country-of-origin compliant per line item where TAA applies.

## Price-to-win method

- Landed cost (distributor quote + freight to destination) + 8–15% margin for
  commodity resale. LPTA buys price at the low end; best-value buys leave room.
- Sanity-check against `market.js` comps (median of recent same-NAICS awards).
- Apple/OEM-rigid products run 3–8% — bid them for past performance, not profit.
- Never price from list price or memory; a live supplier quote or no bid.

## Hard rules

- NEVER submit anything to SAM.gov or a contracting officer — automation
  prepares, a human submits.
- NEVER claim certifications an entity lacks.
- NEVER commit `govcon/pursuits/` (pricing strategy; public repo).
- Flag "offer requires Active SAM registration" on every pursuit for an
  entity whose registration is processing.

## Examples

- `node scripts/govcon/watch.js`
- `node scripts/govcon/market.js --naics 423430 --keyword "desktop computers" --md`
- `node scripts/govcon/draft.js --id 3020348a7511406299ea981ac23728ac --entity allerion-tech`
