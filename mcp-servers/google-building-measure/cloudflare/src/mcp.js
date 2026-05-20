// MCP-over-HTTP endpoint (JSON-RPC 2.0).
// Compatible with Claude Desktop's "type: http" / "url: ..." MCP server config.

import { measureBuilding } from './measure.js';

const TOOLS = [
  {
    name: 'generate_roofr_report',
    description: 'Full building takeoff report from an address: roof sqft, facet count, edge-type lineal feet (eaves/ridges/hips/valleys/rakes/flashings), pitch breakdown, opening counts, material calculator at standard waste percentages.',
    inputSchema: {
      type: 'object',
      properties: {
        address: { type: 'string', description: 'Full street address.' },
        skipStreetView: { type: 'boolean' },
        skipAerialView: { type: 'boolean' },
      },
      required: ['address'],
    },
  },
];

export async function handleMcp(request, env, cors) {
  // GET → minimal capability advertisement (some clients probe with GET)
  if (request.method === 'GET') {
    return new Response(JSON.stringify({ name: 'google-building-measure', version: '0.3.0', protocol: 'mcp/2024-11-05' }), {
      headers: { 'content-type': 'application/json', ...cors },
    });
  }

  let req;
  try {
    req = await request.json();
  } catch {
    return rpcErr(null, -32700, 'Parse error', cors);
  }

  const { id = null, method, params = {} } = req;

  try {
    switch (method) {
      case 'initialize':
        return rpcOk(id, {
          protocolVersion: '2024-11-05',
          serverInfo: { name: 'google-building-measure', version: '0.3.0' },
          capabilities: { tools: {} },
        }, cors);

      case 'tools/list':
        return rpcOk(id, { tools: TOOLS }, cors);

      case 'tools/call': {
        const { name, arguments: args = {} } = params;
        if (name !== 'generate_roofr_report') {
          return rpcErr(id, -32601, `Unknown tool: ${name}`, cors);
        }
        const report = await measureBuilding({
          address: args.address,
          env,
          options: {
            skipStreetView: !!args.skipStreetView,
            skipAerialView: !!args.skipAerialView,
          },
        });
        return rpcOk(id, {
          content: [{ type: 'text', text: JSON.stringify(report, null, 2) }],
        }, cors);
      }

      case 'ping':
        return rpcOk(id, {}, cors);

      default:
        return rpcErr(id, -32601, `Method not found: ${method}`, cors);
    }
  } catch (err) {
    return rpcErr(id, -32000, err.message, cors);
  }
}

function rpcOk(id, result, cors) {
  return new Response(JSON.stringify({ jsonrpc: '2.0', id, result }), {
    headers: { 'content-type': 'application/json', ...cors },
  });
}

function rpcErr(id, code, message, cors) {
  return new Response(JSON.stringify({ jsonrpc: '2.0', id, error: { code, message } }), {
    headers: { 'content-type': 'application/json', ...cors },
  });
}
