#!/usr/bin/env node
/**
 * GovCon market comps — pulls recent award values from the USAspending.gov
 * public API for a NAICS code and/or keyword, and prints min/median/max as a
 * price-to-win reference.
 *
 * Usage: node scripts/govcon/market.js --naics 423430 --keyword "desktop computers" [--md]
 * Requires: Node 18+ (global fetch). No dependencies, no API key.
 */

const args = process.argv.slice(2);
const getArg = (flag) => {
  const i = args.indexOf(flag);
  return i >= 0 ? args[i + 1] : undefined;
};
const naics = getArg('--naics');
const keyword = getArg('--keyword');
const asMd = args.includes('--md');

if (!naics && !keyword) {
  console.error('Usage: node scripts/govcon/market.js --naics <code> --keyword "<term>" [--md]');
  process.exit(2);
}

async function main() {
  const now = new Date();
  const start = new Date(now.getTime() - 2 * 365 * 24 * 3600 * 1000);
  const filters = {
    time_period: [{ start_date: start.toISOString().slice(0, 10), end_date: now.toISOString().slice(0, 10) }],
    award_type_codes: ['A', 'B', 'C', 'D'],
  };
  if (naics) filters.naics_codes = [naics];
  if (keyword) filters.keywords = [keyword];

  const res = await fetch('https://api.usaspending.gov/api/v2/search/spending_by_award/', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      filters,
      fields: ['Award ID', 'Recipient Name', 'Award Amount', 'Awarding Agency', 'Start Date'],
      sort: 'Award Amount',
      order: 'desc',
      limit: 60,
    }),
  });
  if (!res.ok) throw new Error(`USAspending HTTP ${res.status}`);
  const data = await res.json();
  const amounts = (data.results || [])
    .map((r) => Number(r['Award Amount']))
    .filter((n) => Number.isFinite(n) && n > 0)
    .sort((a, b) => a - b);

  if (amounts.length === 0) {
    console.log('No comparable awards found — widen the keyword or drop the NAICS filter.');
    return;
  }
  const median = amounts[Math.floor(amounts.length / 2)];
  const fmt = (n) => `$${Math.round(n).toLocaleString('en-US')}`;
  const label = [naics && `NAICS ${naics}`, keyword && `"${keyword}"`].filter(Boolean).join(' + ');

  if (asMd) {
    console.log(`### Market comps — ${label} (last 24 months, ${amounts.length} awards sampled)`);
    console.log('');
    console.log('| Min | Median | Max |');
    console.log('|---|---|---|');
    console.log(`| ${fmt(amounts[0])} | ${fmt(median)} | ${fmt(amounts[amounts.length - 1])} |`);
    console.log('');
    console.log('Top awards:');
    for (const r of (data.results || []).slice(0, 5)) {
      console.log(`- ${fmt(Number(r['Award Amount']))} — ${r['Recipient Name']} — ${r['Awarding Agency']} (${r['Start Date']})`);
    }
  } else {
    console.log(`${label}: n=${amounts.length} min=${fmt(amounts[0])} median=${fmt(median)} max=${fmt(amounts[amounts.length - 1])}`);
  }
}

main().catch((err) => {
  console.error(`[market] fatal: ${err.message}`);
  process.exit(1);
});
