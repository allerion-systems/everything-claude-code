#!/usr/bin/env node
// SAM.gov MCP server — zero-dependency stdio implementation of the Model
// Context Protocol wrapping SAM.gov public search + notice detail and
// USAspending award history. Register via mcp-configs/mcp-servers.json
// ("sam-gov") to give any Claude session these tools:
//
//   sam_search_opportunities  — keyword search of active federal notices
//   sam_get_notice            — full notice detail (set-aside, NAICS, deadline, description)
//   market_comps              — historical award prices + repeat winners for similar work
//
// Uses only public endpoints (no API key). JSON-RPC 2.0, one message per line.

const readline = require('readline');
const { samSearch, samDetail, usaspendingAwards, awardStats, usd, NOTICE_TYPES } = require('./lib');

const TOOLS = [
  {
    name: 'sam_search_opportunities',
    description: 'Search active federal contract opportunities on SAM.gov by keyword. Returns open notices (solicitations, combined synopses, presolicitations, sources sought) with title, type, agency, response deadline, and notice id for sam_get_notice.',
    inputSchema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Keyword search, e.g. "land clearing" or "Dell PowerEdge"' },
        size: { type: 'number', description: 'Max results (default 15, max 50)' },
      },
      required: ['query'],
    },
  },
  {
    name: 'sam_get_notice',
    description: 'Get full detail for one SAM.gov notice by id: set-aside code, NAICS, PSC, response deadline, place of performance, contracting POC, and description text. Use the id returned by sam_search_opportunities.',
    inputSchema: {
      type: 'object',
      properties: { notice_id: { type: 'string', description: 'SAM.gov notice id (32-char hex)' } },
      required: ['notice_id'],
    },
  },
  {
    name: 'market_comps',
    description: 'Study where similar federal contracts have been won: historical award amounts, price range/median, and repeat winners from USAspending. Filter by NAICS code and/or keywords over a lookback window. Use before pricing a bid.',
    inputSchema: {
      type: 'object',
      properties: {
        naics: { type: 'string', description: 'NAICS code, e.g. "561730"' },
        keywords: { type: 'array', items: { type: 'string' }, description: 'Keyword filters, e.g. ["toner"]' },
        months: { type: 'number', description: 'Lookback window in months (default 24)' },
        limit: { type: 'number', description: 'Max awards sampled (default 50)' },
      },
    },
  },
];

async function callTool(name, args = {}) {
  if (name === 'sam_search_opportunities') {
    const size = Math.min(Number(args.size) || 15, 50);
    const results = await samSearch(String(args.query || ''), size);
    const now = Date.now();
    const rows = results
      .filter((r) => NOTICE_TYPES[(r.type || {}).code])
      .filter((r) => !r.responseDate || Date.parse(r.responseDate) > now)
      .map((r) => ({
        id: r._id,
        title: r.title,
        type: (r.type || {}).value,
        agency: ((r.organizationHierarchy || [])[1] || (r.organizationHierarchy || [])[0] || {}).name || '',
        solicitationNumber: r.solicitationNumber || '',
        responseDeadline: r.responseDate || '',
        url: `https://sam.gov/opp/${r._id}/view`,
      }));
    return JSON.stringify({ count: rows.length, results: rows }, null, 1);
  }
  if (name === 'sam_get_notice') {
    return JSON.stringify(await samDetail(String(args.notice_id)), null, 1);
  }
  if (name === 'market_comps') {
    const rows = await usaspendingAwards({
      naics: args.naics ? [String(args.naics)] : [],
      keywords: Array.isArray(args.keywords) ? args.keywords : [],
      months: Number(args.months) || 24,
      limit: Number(args.limit) || 50,
    });
    const stats = awardStats(rows);
    if (!stats) return 'No matching awards found. Broaden keywords or drop the NAICS filter.';
    return JSON.stringify({
      awardsSampled: stats.count,
      priceRange: { min: usd(stats.min), median: usd(stats.median), mean: usd(stats.mean), max: usd(stats.max) },
      repeatWinners: stats.topRecipients.map(([n, c]) => ({ recipient: n, awards: c })),
      topAwards: rows.slice(0, 15).map((r) => ({
        id: r['Award ID'], recipient: r['Recipient Name'], amount: usd(r['Award Amount']),
        agency: r['Awarding Agency'], start: r['Start Date'],
      })),
    }, null, 1);
  }
  throw new Error(`unknown tool: ${name}`);
}

function reply(id, result) {
  process.stdout.write(JSON.stringify({ jsonrpc: '2.0', id, result }) + '\n');
}
function replyError(id, code, message) {
  process.stdout.write(JSON.stringify({ jsonrpc: '2.0', id, error: { code, message } }) + '\n');
}

const rl = readline.createInterface({ input: process.stdin, terminal: false });
rl.on('line', async (line) => {
  line = line.trim();
  if (!line) return;
  let msg;
  try { msg = JSON.parse(line); } catch { return; }
  const { id, method, params } = msg;
  try {
    if (method === 'initialize') {
      reply(id, {
        protocolVersion: (params && params.protocolVersion) || '2024-11-05',
        capabilities: { tools: {} },
        serverInfo: { name: 'sam-gov', version: '1.0.0' },
      });
    } else if (method === 'notifications/initialized' || (method || '').startsWith('notifications/')) {
      // notifications carry no id and expect no reply
    } else if (method === 'tools/list') {
      reply(id, { tools: TOOLS });
    } else if (method === 'tools/call') {
      const text = await callTool(params.name, params.arguments || {});
      reply(id, { content: [{ type: 'text', text }] });
    } else if (method === 'ping') {
      reply(id, {});
    } else if (id !== undefined) {
      replyError(id, -32601, `method not found: ${method}`);
    }
  } catch (err) {
    if (id !== undefined) replyError(id, -32603, err.message);
  }
});
