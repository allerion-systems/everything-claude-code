'use strict';

/**
 * Guardian — the safety/ethics policy engine for the edge glasses task force.
 *
 * This is the "controlled hazard, ethical boundaries" layer. Nothing the agents
 * plan reaches the real world without passing through here. The defaults are
 * deliberately conservative and privacy-first:
 *
 *   - No covert recording. Capture requires an explicit consent grant.
 *   - PII is redacted before it can leave the device.
 *   - Non-critical actions defer while the wearer's attention is committed
 *     (crossing a street, driving) — the glasses never nag you into traffic.
 *   - Unknown/high-risk action types require confirmation instead of running.
 *
 * Pure functions, no I/O, no external dependencies.
 */

// Verdicts, ordered from most to least permissive.
const VERDICT = {
  ALLOW: 'allow',
  REDACT: 'redact', // allowed, but payload must be sanitized first
  DEFER: 'defer', // safe later; blocked while attention is committed
  CONFIRM: 'confirm', // needs explicit wearer confirmation
  BLOCK: 'block'
};

// Consent capabilities a wearer can grant. Everything defaults to off.
const CAPABILITIES = ['capture.camera', 'capture.audio', 'share.external', 'identify.people', 'store.location'];

// Attention states where the wearer should not be interrupted by optional UI.
const COMMITTED_ATTENTION = new Set(['crossing', 'driving', 'cycling', 'stairs']);

const PII_PATTERNS = [
  { label: 'email', re: /[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/gi },
  { label: 'phone', re: /(?:\+?\d[\s-]?){9,14}\d/g },
  { label: 'card', re: /\b(?:\d[ -]?){13,16}\b/g },
  { label: 'ssn', re: /\b\d{3}-\d{2}-\d{4}\b/g }
];

/**
 * Redact PII from free text before it can leave the device.
 * Returns the sanitized string plus a list of what was removed.
 */
function redactPii(text) {
  if (typeof text !== 'string' || text.length === 0) {
    return { clean: text ?? '', redactions: [] };
  }
  let clean = text;
  const redactions = [];
  for (const { label, re } of PII_PATTERNS) {
    clean = clean.replace(re, match => {
      // Cards and SSNs look alike; only count a card if it is not an SSN.
      if (label === 'card' && /^\d{3}-\d{2}-\d{4}$/.test(match)) return match;
      // Record only the label and length — never the raw value, so the
      // redaction metadata itself cannot leak PII into a persisted trace.
      redactions.push({ label, length: match.length });
      return `[redacted:${label}]`;
    });
  }
  return { clean, redactions };
}

function normalizeGrants(grants) {
  if (!grants) return new Set();
  if (grants instanceof Set) return grants;
  if (Array.isArray(grants)) return new Set(grants);
  // Object form: { 'capture.audio': true }
  return new Set(Object.keys(grants).filter(k => grants[k]));
}

/**
 * True if a capability has been explicitly granted by the wearer.
 */
function hasConsent(capability, grants) {
  return normalizeGrants(grants).has(capability);
}

// Which consent each action type requires (if any).
const ACTION_CONSENT = {
  'capture.photo': 'capture.camera',
  'capture.video': 'capture.camera',
  'capture.audio': 'capture.audio',
  'identify.person': 'identify.people',
  'share.message': 'share.external',
  'remember.location': 'store.location'
};

// Action types considered safe and local (no external side effects). These may
// run without confirmation; hazard.alert is safe *and* critical, so it also
// surfaces during committed attention (see CRITICAL_ACTIONS).
const SAFE_LOCAL_ACTIONS = new Set(['translate.local', 'navigate.hint', 'remember.note', 'identify.object', 'hud.notice', 'answer.speak', 'hazard.alert']);

// Actions important enough to surface even during committed attention.
const CRITICAL_ACTIONS = new Set(['hazard.alert', 'navigate.hint']);

/**
 * Evaluate a single planned action against context and consent grants.
 *
 * action:  { type, target?, payload? }
 * context: { attention?, grants? }
 *
 * Returns { verdict, reasons[], severity, action } where `action` may carry a
 * sanitized payload when the verdict is REDACT.
 */
function evaluateAction(action, context = {}) {
  const reasons = [];
  const grants = context.grants;
  const attention = context.attention || 'idle';
  const type = action && action.type;

  if (!type) {
    return { verdict: VERDICT.BLOCK, reasons: ['action has no type'], severity: 'high', action };
  }

  // 1. Consent gate — capture and external sharing need an explicit grant.
  const required = ACTION_CONSENT[type];
  if (required && !hasConsent(required, grants)) {
    return {
      verdict: VERDICT.BLOCK,
      reasons: [`${type} requires consent "${required}" which is not granted`],
      severity: 'high',
      action
    };
  }

  // 2. Covert recording is never allowed, grant or not, without a visible cue.
  if ((type === 'capture.video' || type === 'capture.audio') && action.covert) {
    return { verdict: VERDICT.BLOCK, reasons: ['covert capture is not permitted'], severity: 'high', action };
  }

  // 3. Attention safety — defer optional UI while attention is committed.
  if (COMMITTED_ATTENTION.has(attention) && !CRITICAL_ACTIONS.has(type)) {
    reasons.push(`attention is "${attention}"; deferring non-critical action`);
    return { verdict: VERDICT.DEFER, reasons, severity: 'low', action };
  }

  // 4. External sharing of text — redact PII before it leaves the device.
  if (type === 'share.message' && action.payload && typeof action.payload.text === 'string') {
    const { clean, redactions } = redactPii(action.payload.text);
    if (redactions.length > 0) {
      reasons.push(`redacted ${redactions.length} PII item(s) before sharing`);
      return {
        verdict: VERDICT.REDACT,
        reasons,
        severity: 'medium',
        action: { ...action, payload: { ...action.payload, text: clean }, redactions }
      };
    }
    return { verdict: VERDICT.ALLOW, reasons: ['no PII detected'], severity: 'low', action };
  }

  // 5. Known-safe local actions pass.
  if (SAFE_LOCAL_ACTIONS.has(type)) {
    return { verdict: VERDICT.ALLOW, reasons: ['safe local action'], severity: 'none', action };
  }

  // 6. Anything unrecognized gets a human in the loop rather than a guess.
  return {
    verdict: VERDICT.CONFIRM,
    reasons: [`unknown action type "${type}" — requires wearer confirmation`],
    severity: 'medium',
    action
  };
}

/**
 * Convenience: split a plan's actions into what may run now and what may not.
 */
function screenPlan(actions, context = {}) {
  const allowed = [];
  const blocked = [];
  const deferred = [];
  const needsConfirm = [];

  for (const action of actions || []) {
    const decision = evaluateAction(action, context);
    switch (decision.verdict) {
      case VERDICT.ALLOW:
      case VERDICT.REDACT:
        allowed.push(decision);
        break;
      case VERDICT.DEFER:
        deferred.push(decision);
        break;
      case VERDICT.CONFIRM:
        needsConfirm.push(decision);
        break;
      default:
        blocked.push(decision);
    }
  }

  return { allowed, blocked, deferred, needsConfirm };
}

module.exports = {
  VERDICT,
  CAPABILITIES,
  ACTION_CONSENT,
  SAFE_LOCAL_ACTIONS,
  redactPii,
  hasConsent,
  evaluateAction,
  screenPlan
};
