#!/usr/bin/env node
/**
 * Handoff (handoff.ai) API client scaffold for the construction drawing agent.
 * Zero dependencies - Node 18+ (global fetch). Mirrors the conventions of
 * scripts/hover/hover-api.js so a Handoff-sourced plan-model can eventually
 * flow through the same pipeline (generate-plans.js, sketchup-code.js) as
 * HOVER and GIS site-scout do today.
 *
 * NOT YET WIRED UP. As of this writing, Handoff has no public API:
 *   https://help.handoff.ai/en/articles/9778505-does-handoff-have-an-api
 * states plainly "Handoff does not currently have an API available for use."
 * There is no published base URL, auth flow, or endpoint/response shape to
 * build against - every command below fails fast with NOT_CONFIGURED instead
 * of guessing at any of those.
 *
 * Once real documentation exists (base URL, auth model, endpoint paths,
 * request/response shapes), fill in requestHandoff() and the command
 * functions the same way hover-api.js implements its `api()` helper and
 * cmdJobs/cmdJob/cmdPull.
 *
 * Auth (matches the HOVER pattern - env var first, no hardcoded secrets):
 *   HANDOFF_API_KEY            - required once a real base URL exists
 *   HANDOFF_API_BASE           - base URL override (unset until documented)
 *   HANDOFF_CREDENTIALS_FILE   - optional cache path override, written 0600,
 *                                 defaults to ~/.claude/handoff-credentials.json
 *                                 (only needed if a future auth flow requires
 *                                 caching a rotating token, same as HOVER's
 *                                 refresh-token rotation)
 *
 * Commands (all currently stubs - see NOT_CONFIGURED above):
 *   node scripts/handoff/handoff-api.js whoami
 *   node scripts/handoff/handoff-api.js projects [search terms]
 *   node scripts/handoff/handoff-api.js project <project_id>
 */

const fs = require('fs');
const os = require('os');
const path = require('path');

const BASE = process.env.HANDOFF_API_BASE || null;
const CREDS_PATH = process.env.HANDOFF_CREDENTIALS_FILE ||
  path.join(os.homedir(), '.claude', 'handoff-credentials.json');

const NOT_CONFIGURED = [
  'Handoff has no public API yet (see help.handoff.ai - "Does Handoff have',
  'an API?"). This script is a scaffold: set HANDOFF_API_BASE and fill in',
  'requestHandoff() with real endpoints once you have documentation from',
  'Handoff. Nothing is guessed or fabricated here.'
].join(' ');

// ---------------------------------------------------------------------------
// Credentials (env-var first, matching hover-api.js - no hardcoded secrets)
// ---------------------------------------------------------------------------

function readCache() {
  try {
    return JSON.parse(fs.readFileSync(CREDS_PATH, 'utf8'));
  } catch (_err) {
    return {};
  }
}

function writeCache(data) {
  fs.mkdirSync(path.dirname(CREDS_PATH), { recursive: true });
  fs.writeFileSync(CREDS_PATH, JSON.stringify(data, null, 2), { mode: 0o600 });
}

function getApiKey() {
  if (process.env.HANDOFF_API_KEY) return process.env.HANDOFF_API_KEY;
  const cache = readCache();
  if (cache.api_key) return cache.api_key;
  throw new Error(
    'No Handoff credentials. Set HANDOFF_API_KEY (never hardcode it - not in ' +
    'code, not in chat, not committed to the repo).'
  );
}

// ---------------------------------------------------------------------------
// HTTP (stubbed until a real base URL and endpoint set exist)
// ---------------------------------------------------------------------------

async function requestHandoff(_pathname, _options = {}) {
  if (!BASE) {
    throw new Error(NOT_CONFIGURED);
  }
  // Intentionally unreachable until HANDOFF_API_BASE and real endpoints are
  // documented - do not fabricate a fetch() call against a guessed host.
  throw new Error(NOT_CONFIGURED);
}

// ---------------------------------------------------------------------------
// Commands
// ---------------------------------------------------------------------------

async function cmdWhoami() {
  getApiKey(); // still validated even in stub form - fail on missing key first
  await requestHandoff('/whoami');
}

async function cmdProjects(_searchTerms) {
  getApiKey();
  await requestHandoff('/projects');
}

async function cmdProject(_projectId) {
  getApiKey();
  await requestHandoff(`/projects/${_projectId}`);
}

// ---------------------------------------------------------------------------

function parseArgs(argv) {
  const args = { _: [] };
  for (let i = 0; i < argv.length; i++) {
    args._.push(argv[i]);
  }
  return args;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const [command, ...rest] = args._;
  try {
    if (command === 'whoami') await cmdWhoami();
    else if (command === 'projects') await cmdProjects(rest);
    else if (command === 'project' && rest[0]) await cmdProject(rest[0]);
    else {
      console.error('Usage: handoff-api.js <whoami|projects [search]|project <id>>');
      process.exit(2);
    }
  } catch (err) {
    console.error(err.message);
    process.exit(1);
  }
}

if (require.main === module) main();

module.exports = { getApiKey, requestHandoff, NOT_CONFIGURED };
