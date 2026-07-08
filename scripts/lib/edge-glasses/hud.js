'use strict';

/**
 * HUD renderer — formats a tick's result for a tiny monocular heads-up display
 * and for a terse voice channel.
 *
 * A lens display is small and glanceable: a handful of short lines. Anything
 * longer than the wearer can read at a glance is worse than nothing, so the
 * renderer enforces a strict line and column budget and drops overflow.
 */

const DEFAULT_HUD = { maxLines: 5, width: 32 };

function truncate(text, width) {
  const s = String(text ?? '');
  if (s.length <= width) return s;
  return s.slice(0, Math.max(0, width - 1)) + '…';
}

function verbForAction(action) {
  const map = {
    'translate.local': 'Translate',
    'navigate.hint': 'Go',
    'remember.note': 'Noted',
    'identify.object': 'This is',
    'hud.notice': '',
    'answer.speak': 'Say',
    'hazard.alert': '⚠',
    'share.message': 'Send'
  };
  const label = map[action.type];
  const detail = (action.payload && (action.payload.text || action.payload.hint || action.payload.to)) || action.target || '';
  return [label, detail].filter(Boolean).join(' ').trim();
}

/**
 * Render the HUD as an array of lines (glanceable, ordered by priority).
 * tick: { scene?, allowed?, alerts?, deferred?, blocked? }
 */
function renderHud(tick = {}, opts = {}) {
  const { maxLines, width } = { ...DEFAULT_HUD, ...opts };
  const lines = [];

  for (const alert of tick.alerts || []) {
    lines.push(truncate('⚠ ' + (alert.payload ? alert.payload.text : alert.text || 'alert'), width));
  }
  for (const decision of tick.allowed || []) {
    const action = decision.action || decision;
    if (action.type === 'hazard.alert') continue; // already shown as an alert
    const label = verbForAction(action);
    if (label) lines.push(truncate(label, width));
  }
  if ((tick.blocked || []).length > 0 && lines.length < maxLines) {
    lines.push(truncate(`(${tick.blocked.length} blocked)`, width));
  }
  if (lines.length === 0) lines.push(truncate('•', width));

  return lines.slice(0, maxLines);
}

/**
 * A single short utterance for the voice channel — the highest-priority thing
 * only, because the wearer cannot skim audio.
 */
function renderVoice(tick = {}) {
  if ((tick.alerts || []).length > 0) {
    const a = tick.alerts[0];
    return (a.payload && a.payload.text) || a.text || 'Careful.';
  }
  const spoken = (tick.allowed || []).map(d => d.action || d).find(a => a.type === 'answer.speak' || a.type === 'navigate.hint');
  if (spoken) return verbForAction(spoken);
  return '';
}

module.exports = {
  DEFAULT_HUD,
  renderHud,
  renderVoice,
  verbForAction
};
