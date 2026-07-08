'use strict';

/**
 * Reflection — the "improve yourself" loop.
 *
 * The task force keeps an episodic trace of every tick (scene -> plan ->
 * verdicts). Reflection mines that trace offline, between glances, for two
 * kinds of improvement:
 *
 *   1. Reflexes — a scene signature that reliably produced the same allowed
 *      action becomes a cached shortcut, letting the next matching tick skip
 *      the planner entirely and save its latency budget.
 *   2. Policy hints — an action the Guardian repeatedly blocks or defers is
 *      surfaced as a candidate consent prompt or policy adjustment, so the
 *      wearer is asked once instead of being silently thwarted every time.
 *
 * Pure and deterministic. Proposals are advisory: they are never auto-applied.
 */

// A coarse signature for a scene — the salient nouns/verbs, order-independent.
function sceneSignature(scene) {
  const words = String(scene || '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length > 3);
  const unique = Array.from(new Set(words)).sort();
  return unique.slice(0, 8).join('|');
}

function actionKey(action) {
  return `${action.type}:${action.target || ''}`;
}

/**
 * Mine a list of traces into reflex + policy proposals.
 *
 * trace item: { scene, allowed: [{action}], blocked: [{action,reasons}],
 *               deferred: [{action}] }
 * options: { minEvidence = 2 }
 */
function reflect(traces, { minEvidence = 2 } = {}) {
  const reflexTally = new Map(); // sig::actionKey -> { sig, action, count }
  const blockTally = new Map(); // actionKey -> { action, count, reasons:Set }

  for (const trace of traces || []) {
    const sig = sceneSignature(trace.scene);
    for (const decision of trace.allowed || []) {
      const action = decision.action || decision;
      const key = `${sig}::${actionKey(action)}`;
      const entry = reflexTally.get(key) || { sig, action, count: 0 };
      entry.count += 1;
      reflexTally.set(key, entry);
    }
    for (const decision of [...(trace.blocked || []), ...(trace.deferred || [])]) {
      const action = decision.action || decision;
      const key = actionKey(action);
      const entry = blockTally.get(key) || { action, count: 0, reasons: new Set() };
      entry.count += 1;
      for (const r of decision.reasons || []) entry.reasons.add(r);
      blockTally.set(key, entry);
    }
  }

  const reflexes = [];
  for (const entry of reflexTally.values()) {
    if (entry.sig && entry.count >= minEvidence) {
      reflexes.push({
        trigger: entry.sig,
        action: entry.action,
        evidenceCount: entry.count,
        confidence: Math.min(1, entry.count / (minEvidence * 2))
      });
    }
  }
  reflexes.sort((a, b) => b.evidenceCount - a.evidenceCount);

  const policyHints = [];
  for (const entry of blockTally.values()) {
    if (entry.count >= minEvidence) {
      policyHints.push({
        action: entry.action,
        occurrences: entry.count,
        reasons: Array.from(entry.reasons),
        suggestion: suggestForBlock(entry)
      });
    }
  }
  policyHints.sort((a, b) => b.occurrences - a.occurrences);

  return { reflexes, policyHints };
}

function suggestForBlock(entry) {
  const reason = Array.from(entry.reasons)[0] || '';
  const consentMatch = reason.match(/consent "([^"]+)"/);
  if (consentMatch) {
    return `Prompt the wearer once to grant "${consentMatch[1]}" for ${entry.action.type}.`;
  }
  if (/attention/.test(reason)) {
    return `Queue ${entry.action.type} to replay when attention returns to idle.`;
  }
  return `Review policy for ${entry.action.type} — blocked ${entry.count}x.`;
}

/**
 * Index reflexes by trigger for O(1) lookup during a live tick.
 */
function buildReflexIndex(reflexes) {
  const index = new Map();
  for (const reflex of reflexes || []) index.set(reflex.trigger, reflex);
  return index;
}

module.exports = {
  sceneSignature,
  reflect,
  buildReflexIndex
};
