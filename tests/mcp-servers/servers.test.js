/**
 * Tests for mcp-servers/hover and mcp-servers/handoff
 *
 * Spawns each stdio MCP server and verifies a real MCP handshake:
 * initialize -> tools/list, plus an unconfigured-credentials error path.
 * Skips a server gracefully when its node_modules are not installed.
 *
 * Run with: node tests/mcp-servers/servers.test.js
 */

const assert = require('assert');
const path = require('path');
const fs = require('fs');
const { spawnSync } = require('child_process');

const repoRoot = path.resolve(__dirname, '..', '..');

function mcpRoundtrip(serverDir, extraMessages = [], env = {}) {
  const messages = [
    {
      jsonrpc: '2.0',
      id: 1,
      method: 'initialize',
      params: {
        protocolVersion: '2024-11-05',
        capabilities: {},
        clientInfo: { name: 'ecc-test', version: '0' },
      },
    },
    { jsonrpc: '2.0', method: 'notifications/initialized' },
    { jsonrpc: '2.0', id: 2, method: 'tools/list' },
    ...extraMessages,
  ];
  const input = messages.map((m) => JSON.stringify(m)).join('\n') + '\n';
  const res = spawnSync('node', [path.join(serverDir, 'index.js')], {
    input,
    encoding: 'utf8',
    timeout: 20000,
    env: { ...process.env, ...env },
  });
  const responses = res.stdout
    .split('\n')
    .filter((l) => l.trim())
    .map((l) => JSON.parse(l));
  const byId = {};
  for (const r of responses) if (r.id !== undefined) byId[r.id] = r;
  return byId;
}

function test(name, fn) {
  try {
    fn();
    console.log(`  ✓ ${name}`);
    return true;
  } catch (err) {
    console.log(`  ✗ ${name}`);
    console.log(`    Error: ${err.message}`);
    return false;
  }
}

function runTests() {
  console.log('\n=== Testing mcp-servers ===\n');

  let passed = 0;
  let failed = 0;
  let skipped = 0;

  const servers = [
    {
      name: 'hover',
      expectedTools: ['hover_list_jobs', 'hover_get_job', 'hover_get_measurements', 'hover_raw_request'],
    },
    {
      name: 'handoff',
      expectedTools: ['handoff_status', 'handoff_create_estimate', 'handoff_get_estimate', 'handoff_raw_request'],
      // handoff_status with no credentials must return an error mentioning the env vars to set
      statusTool: 'handoff_status',
    },
  ];

  for (const server of servers) {
    const dir = path.join(repoRoot, 'mcp-servers', server.name);
    console.log(`${server.name}:`);

    if (!fs.existsSync(path.join(dir, 'node_modules'))) {
      console.log(`  - skipped (run npm install in mcp-servers/${server.name} first)`);
      skipped++;
      continue;
    }

    const extra = server.statusTool
      ? [{ jsonrpc: '2.0', id: 3, method: 'tools/call', params: { name: server.statusTool, arguments: {} } }]
      : [];
    let byId;
    if (
      test('completes MCP initialize + tools/list handshake', () => {
        byId = mcpRoundtrip(dir, extra, {
          HANDOFF_CLIENT_ID: '',
          HANDOFF_CLIENT_SECRET: '',
          HOVER_ACCESS_TOKEN: '',
        });
        assert.ok(byId[2], 'no tools/list response');
      })
    ) passed++; else { failed++; continue; }

    if (
      test('exposes the expected tools', () => {
        const names = byId[2].result.tools.map((t) => t.name);
        for (const expected of server.expectedTools) {
          assert.ok(names.includes(expected), `missing tool ${expected}`);
        }
      })
    ) passed++; else failed++;

    if (
      test('every tool has a description and an object inputSchema', () => {
        for (const t of byId[2].result.tools) {
          assert.ok(t.description && t.description.length > 10, `${t.name} lacks description`);
          assert.strictEqual(t.inputSchema.type, 'object', `${t.name} schema not object`);
        }
      })
    ) passed++; else failed++;

    if (server.statusTool) {
      if (
        test('status tool without credentials explains what env vars to set', () => {
          const text = byId[3].result.content[0].text;
          assert.ok(/HANDOFF_CLIENT_ID/.test(text), 'error should name HANDOFF_CLIENT_ID');
        })
      ) passed++; else failed++;
    }
  }

  console.log(`\nResults: ${passed} passed, ${failed} failed, ${skipped} skipped\n`);
  process.exit(failed > 0 ? 1 : 0);
}

runTests();
