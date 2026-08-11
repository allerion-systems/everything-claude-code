#!/usr/bin/env node
// Market study: where have similar contracts been won, by whom, and at what
// price? Queries USAspending (free, no key) for historical awards matching a
// NAICS code and/or keywords, then prints win-price statistics and the
// incumbents who keep winning. Feed the numbers into a pursuit's pricing
// worksheet before quoting.
//
// Usage:
//   node scripts/govcon/market.js --naics 339940 --keyword toner
//   node scripts/govcon/market.js --keyword "land clearing" --months 36 --md

const { usaspendingAwards, awardStats, usd } = require('./lib');

const args = process.argv.slice(2);
function opt(name, fallback) {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? args[i + 1] : fallback;
}
const naics = args.includes('--naics') ? [opt('naics')] : [];
const keywords = [];
for (let i = 0; i < args.length; i++) if (args[i] === '--keyword') keywords.push(args[i + 1]);
const months = Number(opt('months', 24));
const limit = Number(opt('limit', 50));
const asMd = args.includes('--md');

async function main() {
  if (!naics.length && !keywords.length) {
    console.error('usage: market.js [--naics CODE] [--keyword TERM]... [--months N] [--limit N] [--md]');
    process.exit(2);
  }
  const rows = await usaspendingAwards({ naics, keywords, months, limit });
  const stats = awardStats(rows);
  const scope = [naics.length ? `NAICS ${naics.join(',')}` : '', keywords.length ? `"${keywords.join('", "')}"` : '']
    .filter(Boolean).join(' + ');

  if (!stats) {
    console.log(`No awards found in the last ${months} months for ${scope}. Broaden the keyword or drop the NAICS filter.`);
    return;
  }

  const out = [];
  if (asMd) {
    out.push(`### Market comps — ${scope} (last ${months} months)`, '');
    out.push(`- Awards sampled: **${stats.count}** (top ${limit} by amount)`);
    out.push(`- Win price range: **${usd(stats.min)} – ${usd(stats.max)}**, median **${usd(stats.median)}**, mean **${usd(stats.mean)}**`);
    out.push(`- Repeat winners: ${stats.topRecipients.map(([n, c]) => `${n} (${c})`).join('; ')}`, '');
    out.push('| Award | Recipient | Amount | Agency | Start |');
    out.push('|-------|-----------|--------|--------|-------|');
    for (const r of rows.slice(0, 15)) {
      out.push(`| ${r['Award ID']} | ${r['Recipient Name']} | ${usd(r['Award Amount'])} | ${r['Awarding Agency']} | ${r['Start Date'] || ''} |`);
    }
  } else {
    out.push(`Market comps — ${scope} (last ${months} months)`);
    out.push(`awards sampled: ${stats.count}   range: ${usd(stats.min)} – ${usd(stats.max)}   median: ${usd(stats.median)}   mean: ${usd(stats.mean)}`);
    out.push('repeat winners: ' + stats.topRecipients.map(([n, c]) => `${n} (${c}x)`).join(', '));
    out.push('');
    for (const r of rows.slice(0, 15)) {
      out.push(`  ${usd(r['Award Amount']).padStart(14)}  ${String(r['Recipient Name']).slice(0, 40).padEnd(40)}  ${r['Awarding Agency']}`);
    }
  }
  console.log(out.join('\n'));
}

main().catch((err) => { console.error(err); process.exit(1); });
