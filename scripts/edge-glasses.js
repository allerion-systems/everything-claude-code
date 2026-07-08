#!/usr/bin/env node
'use strict';

/**
 * EdgeGlass — the G-Stack edge AI glasses agentic task force (demo runner).
 *
 * Drives the perceive -> guard -> plan -> act loop over a scripted set of
 * sensor frames using a LOCAL model (Ollama/llama.cpp on localhost) or the
 * built-in offline responder, then runs the reflection loop over the trace.
 *
 * Runs with zero cloud tokens and zero external dependencies.
 *
 * Usage:
 *   node scripts/edge-glasses.js              # offline demo
 *   node scripts/edge-glasses.js --json       # machine-readable trace
 *   GLASS_MODEL_ENDPOINT=http://127.0.0.1:11434 GLASS_MODEL=hermes \
 *     node scripts/edge-glasses.js            # drive a real local model
 *
 * Consent (privacy-first, everything off by default):
 *   GLASS_GRANTS=capture.camera,capture.audio node scripts/edge-glasses.js
 */

const { LocalModelClient, OFFLINE } = require('./lib/edge-glasses/local-model');
const { createMockHub } = require('./lib/edge-glasses/perception');
const { TaskForce } = require('./lib/edge-glasses/task-force');
const { reflect, buildReflexIndex } = require('./lib/edge-glasses/reflection');
const { renderHud, renderVoice } = require('./lib/edge-glasses/hud');

// A short scripted walk: each frame is what the glasses "see"/"hear" at a step.
const DEMO_FRAMES = [
  { context: { attention: 'idle' }, frame: { camera: { caption: 'a French street sign with a menu, please translate' } } },
  { context: { attention: 'crossing' }, frame: { camera: { caption: 'a curb and traffic, watch out for the car coming' } } },
  { context: { attention: 'idle' }, frame: { camera: { caption: 'lost in a train station, which way to the platform' } } },
  { context: { attention: 'idle' }, frame: { camera: { caption: 'a French street sign with a menu, please translate' } } },
  { context: { attention: 'idle' }, frame: { camera: { caption: 'what is this device on the desk, identify it' } } },
  { context: { attention: 'idle' }, frame: { audio: { transcript: 'text Sam that my number is 555-123-4567' } } }
];

function parseGrants(raw) {
  return String(raw || '')
    .split(',')
    .map(s => s.trim())
    .filter(Boolean);
}

function buildTaskForce() {
  const endpoint = process.env.GLASS_MODEL_ENDPOINT || OFFLINE;
  const model = new LocalModelClient({ endpoint, model: process.env.GLASS_MODEL || 'hermes' });
  const hub = createMockHub({ grants: parseGrants(process.env.GLASS_GRANTS) });
  return { model, taskForce: new TaskForce({ model, hub }), endpoint };
}

// The demo represents a wearer who has opted in to on-lens capture. Real
// deployments read grants from device consent state; nothing captures without.
const DEMO_DEFAULT_GRANTS = ['capture.camera', 'capture.audio', 'share.external'];

async function runDemo() {
  const { taskForce, endpoint } = buildTaskForce();
  const grants = process.env.GLASS_GRANTS ? parseGrants(process.env.GLASS_GRANTS) : DEMO_DEFAULT_GRANTS;
  const ticks = [];
  for (const step of DEMO_FRAMES) {
    const context = { ...step.context, grants };
    ticks.push(await taskForce.tick(step.frame, context));
  }
  const learning = reflect(taskForce.memory);
  taskForce.loadReflexes(buildReflexIndex(learning.reflexes));
  return { endpoint, ticks, learning };
}

function printHuman({ endpoint, ticks, learning }) {
  const brain = endpoint === OFFLINE ? 'offline responder (no server)' : `local model @ ${endpoint}`;
  console.log('┌────────────────────────────────────────────────┐');
  console.log('│  EdgeGlass — G-Stack edge AI task force          │');
  console.log('└────────────────────────────────────────────────┘');
  console.log(`brain: ${brain}   cloud tokens spent: 0\n`);

  ticks.forEach((tick, i) => {
    console.log(`── tick ${i + 1} ${tick.usedReflex ? '(reflex)' : ''} ─ attention:${tick.attention}`);
    console.log(`   ${tick.scene}`);
    const hud = renderHud(tick).map(l => `      ▸ ${l}`).join('\n');
    console.log('   HUD:');
    console.log(hud);
    const voice = renderVoice(tick);
    if (voice) console.log(`   🔊 "${voice}"`);
    for (const d of tick.allowed) {
      if (d.action.redactions && d.action.redactions.length) {
        console.log(`   ✂  redacted before sharing: ${d.action.redactions.map(r => r.label).join(', ')}`);
      }
    }
    if (tick.blocked.length) {
      for (const b of tick.blocked) console.log(`   ⛔ ${b.action.type}: ${b.reasons[0]}`);
    }
    if (tick.deferred.length) {
      for (const d of tick.deferred) console.log(`   ⏸ deferred ${d.action.type}: ${d.reasons[0]}`);
    }
    const l = tick.latency;
    console.log(`   ⏱  ${l.total}ms / ${l.budget}ms budget ${l.withinBudget ? '✓' : '✗ ' + l.overBudgetStages.join(',')}\n`);
  });

  console.log('── reflection (improve yourself) ──');
  if (learning.reflexes.length === 0 && learning.policyHints.length === 0) {
    console.log('   (no proposals yet)');
  }
  for (const r of learning.reflexes) {
    console.log(`   ⚡ reflex: "${r.trigger}" → ${r.action.type} (seen ${r.evidenceCount}x, conf ${r.confidence.toFixed(2)})`);
  }
  for (const h of learning.policyHints) {
    console.log(`   🛡 policy: ${h.suggestion} (${h.occurrences}x)`);
  }
}

async function main() {
  const asJson = process.argv.includes('--json');
  const result = await runDemo();
  if (asJson) {
    console.log(JSON.stringify(result, null, 2));
  } else {
    printHuman(result);
  }
}

module.exports = { DEMO_FRAMES, buildTaskForce, runDemo, parseGrants, main };

if (require.main === module) {
  main().catch(err => {
    console.error(`edge-glasses failed: ${err.message}`);
    process.exit(1);
  });
}
