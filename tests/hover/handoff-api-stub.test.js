/**
 * Tests for the Handoff API scaffold: scripts/handoff/handoff-api.js
 *
 * Handoff has no public API yet, so this only asserts the scaffold fails
 * fast and safely - no network call, no hardcoded secret, no guessed
 * endpoint - rather than testing any real request/response behavior.
 *
 * Run with: node tests/hover/handoff-api-stub.test.js
 */

const assert = require('assert');
const fs = require('fs');

const handoff = require('../../scripts/handoff/handoff-api');

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
  console.log('\n=== Testing Handoff API scaffold (stub) ===\n');

  let passed = 0;
  let failed = 0;
  const t = (name, fn) => { if (test(name, fn)) passed++; else failed++; };
  const at = async (name, fn) => { if (await asyncTest(name, fn)) passed++; else failed++; };

  console.log('Credentials:');

  const savedKey = process.env.HANDOFF_API_KEY;
  const savedCredsFile = process.env.HANDOFF_CREDENTIALS_FILE;

  t('getApiKey throws a clear error when no HANDOFF_API_KEY is set and no cache exists', () => {
    delete process.env.HANDOFF_API_KEY;
    process.env.HANDOFF_CREDENTIALS_FILE = '/nonexistent/path/handoff-credentials.json';
    assert.throws(() => handoff.getApiKey(), /No Handoff credentials/);
  });

  t('getApiKey never reads a hardcoded secret - only process.env.HANDOFF_API_KEY', () => {
    process.env.HANDOFF_API_KEY = 'test-only-placeholder-key';
    assert.strictEqual(handoff.getApiKey(), 'test-only-placeholder-key');
  });

  const source = fs.readFileSync(
    require.resolve('../../scripts/handoff/handoff-api.js'),
    'utf8'
  );
  t('handoff-api.js source contains no hardcoded API key literal', () => {
    assert.ok(!/hnd_[a-f0-9]{10,}/i.test(source), 'found a Handoff-shaped key literal in source');
  });

  if (savedKey === undefined) delete process.env.HANDOFF_API_KEY;
  else process.env.HANDOFF_API_KEY = savedKey;
  if (savedCredsFile === undefined) delete process.env.HANDOFF_CREDENTIALS_FILE;
  else process.env.HANDOFF_CREDENTIALS_FILE = savedCredsFile;

  console.log('\nRequests (all stubbed - no public API exists yet):');

  await at('requestHandoff rejects with NOT_CONFIGURED instead of attempting a network call', async () => {
    await assert.rejects(
      () => handoff.requestHandoff('/whoami'),
      (err) => err.message === handoff.NOT_CONFIGURED
    );
  });

  t('NOT_CONFIGURED message points at real Handoff documentation, not a guessed endpoint', () => {
    assert.ok(handoff.NOT_CONFIGURED.includes('help.handoff.ai'));
    assert.ok(!/https?:\/\/api\.handoff/i.test(handoff.NOT_CONFIGURED), 'must not fabricate a base URL');
  });

  console.log(`\nResults: Passed: ${passed}, Failed: ${failed}`);
  if (failed > 0) process.exitCode = 1;
}

if (require.main === module) runTests();

module.exports = { runTests };
