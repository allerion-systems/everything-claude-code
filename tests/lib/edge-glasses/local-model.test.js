/**
 * Tests for scripts/lib/edge-glasses/local-model.js
 *
 * Run with: node tests/lib/edge-glasses/local-model.test.js
 */

const assert = require('assert');
const path = require('path');

const { OFFLINE, LocalModelClient, parseToolCalls, offlineResponder, extractContent } = require(path.join(__dirname, '..', '..', '..', 'scripts', 'lib', 'edge-glasses', 'local-model.js'));

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

async function asyncTest(name, fn) {
  try {
    await fn();
    console.log(`  ✓ ${name}`);
    return true;
  } catch (err) {
    console.log(`  ✗ ${name}`);
    console.log(`    Error: ${err.message}`);
    return false;
  }
}

async function runTests() {
  console.log('\n=== Testing edge-glasses/local-model.js ===\n');
  let passed = 0;
  let failed = 0;

  console.log('Tool-call parsing:');

  if (test('parses a fenced json actions block', () => {
    const content = 'Here you go:\n```json\n{"actions":[{"type":"navigate.hint","target":"gate"}]}\n```';
    const calls = parseToolCalls(content);
    assert.strictEqual(calls.length, 1);
    assert.strictEqual(calls[0].type, 'navigate.hint');
    assert.strictEqual(calls[0].target, 'gate');
  })) passed++; else failed++;

  if (test('parses a bare json array with no fence', () => {
    const calls = parseToolCalls('[{"type":"remember.note","payload":{"text":"x"}}]');
    assert.strictEqual(calls.length, 1);
    assert.strictEqual(calls[0].type, 'remember.note');
  })) passed++; else failed++;

  if (test('ignores malformed json gracefully', () => {
    const calls = parseToolCalls('not json at all { oops');
    assert.deepStrictEqual(calls, []);
  })) passed++; else failed++;

  if (test('carries the covert flag through', () => {
    const calls = parseToolCalls('{"type":"capture.video","covert":true}');
    assert.strictEqual(calls[0].covert, true);
  })) passed++; else failed++;

  console.log('\nOffline responder:');

  if (test('maps a translate scene to translate.local', () => {
    const { actions } = offlineResponder([{ role: 'user', content: 'scene: a french menu sign, please translate' }]);
    assert.ok(actions.some(a => a.type === 'translate.local'));
  })) passed++; else failed++;

  if (test('prepends a hazard alert for danger scenes', () => {
    const { actions } = offlineResponder([{ role: 'user', content: 'scene: a car coming at the curb' }]);
    assert.strictEqual(actions[0].type, 'hazard.alert');
  })) passed++; else failed++;

  if (test('emits share.message when a number should be texted', () => {
    const { actions } = offlineResponder([{ role: 'user', content: 'scene: audio:text Sam my number 555-123-4567 (0.6)' }]);
    assert.ok(actions.some(a => a.type === 'share.message'));
  })) passed++; else failed++;

  if (test('falls back to hud.notice when nothing matches', () => {
    const { actions } = offlineResponder([{ role: 'user', content: 'scene: a plain empty room' }]);
    assert.strictEqual(actions.length, 1);
    assert.strictEqual(actions[0].type, 'hud.notice');
  })) passed++; else failed++;

  console.log('\nExtract content:');

  if (test('reads Ollama message shape', () => {
    assert.strictEqual(extractContent({ message: { content: 'hi' } }), 'hi');
  })) passed++; else failed++;

  if (test('reads OpenAI choices shape', () => {
    assert.strictEqual(extractContent({ choices: [{ message: { content: 'yo' } }] }), 'yo');
  })) passed++; else failed++;

  console.log('\nClient behavior:');

  if (await asyncTest('offline client returns parsed actions without a server', async () => {
    const client = new LocalModelClient({ endpoint: OFFLINE });
    assert.strictEqual(client.isOffline(), true);
    const res = await client.chat([{ role: 'user', content: 'scene: a french sign, translate please' }]);
    assert.strictEqual(res.offline, true);
    assert.ok(res.actions.some(a => a.type === 'translate.local'));
  })) passed++; else failed++;

  if (await asyncTest('http client hits the local endpoint with an injected fetch', async () => {
    const calls = [];
    const fakeFetch = async (url, opts) => {
      calls.push({ url, body: JSON.parse(opts.body) });
      return {
        ok: true,
        json: async () => ({ message: { content: '```json\n{"actions":[{"type":"hud.notice"}]}\n```' } })
      };
    };
    const client = new LocalModelClient({ endpoint: 'http://127.0.0.1:11434', model: 'hermes', fetchImpl: fakeFetch });
    assert.strictEqual(client.isOffline(), false);
    const res = await client.chat([{ role: 'user', content: 'hello' }]);
    assert.strictEqual(res.offline, false);
    assert.ok(/127\.0\.0\.1:11434\/api\/chat$/.test(calls[0].url), `expected ollama url, got ${calls[0].url}`);
    assert.strictEqual(calls[0].body.model, 'hermes');
    assert.strictEqual(res.actions[0].type, 'hud.notice');
  })) passed++; else failed++;

  if (await asyncTest('http client throws on non-ok response', async () => {
    const fakeFetch = async () => ({ ok: false, status: 500, json: async () => ({}) });
    const client = new LocalModelClient({ endpoint: 'http://127.0.0.1:8080/v1/chat/completions', fetchImpl: fakeFetch });
    let threw = false;
    try {
      await client.chat([{ role: 'user', content: 'x' }]);
    } catch (err) {
      threw = /HTTP 500/.test(err.message);
    }
    assert.strictEqual(threw, true);
  })) passed++; else failed++;

  console.log(`\nResults: Passed: ${passed}, Failed: ${failed}`);
  process.exit(failed > 0 ? 1 : 0);
}

runTests();
