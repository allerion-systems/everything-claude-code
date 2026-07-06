'use strict';

/**
 * Local model client — the "no cloud tokens" brain of the glasses.
 *
 * Talks to a model running on the wearer's own hardware over localhost:
 *   - Ollama            (POST /api/chat)
 *   - llama.cpp server  (POST /v1/chat/completions, OpenAI-compatible)
 * Default model id is "hermes" — any local Hermes GGUF served by the above.
 *
 * Because it only ever hits a loopback endpoint, no prompt or frame leaves the
 * device and no metered API token is ever spent.
 *
 * A deterministic OFFLINE responder is built in so the whole task force runs
 * (and tests) with no server at all. Pass endpoint 'offline' to force it.
 */

const OFFLINE = 'offline';

// A minimal on-device tool-call convention the planner is asked to follow.
// The model emits a fenced ```json block; we parse the first valid one.
function parseToolCalls(content) {
  if (typeof content !== 'string') return [];
  const calls = [];
  const fence = /```(?:json)?\s*([\s\S]*?)```/g;
  let match;
  while ((match = fence.exec(content)) !== null) {
    const parsed = tryParse(match[1]);
    if (parsed) collectCalls(parsed, calls);
  }
  if (calls.length === 0) {
    // Fall back to a bare JSON object/array with no fence.
    const parsed = tryParse(content);
    if (parsed) collectCalls(parsed, calls);
  }
  return calls;
}

function tryParse(text) {
  try {
    return JSON.parse(String(text).trim());
  } catch {
    return null;
  }
}

function collectCalls(parsed, calls) {
  const items = Array.isArray(parsed) ? parsed : parsed.actions || parsed.tool_calls || [parsed];
  for (const item of items) {
    if (item && typeof item === 'object' && item.type) {
      calls.push({ type: item.type, target: item.target, payload: item.payload, covert: !!item.covert });
    }
  }
}

/**
 * The offline planner: a small, transparent rule set that maps an observed
 * scene to a bounded plan. Not smart — just enough to exercise the whole
 * pipeline deterministically when no local server is present.
 */
function offlineResponder(messages) {
  const user = [...messages].reverse().find(m => m.role === 'user');
  const rawScene = user && user.content ? user.content : '';
  const scene = rawScene.toLowerCase();
  const actions = [];

  if (/\b(text|message|send|share)\b/.test(scene) && /\d{3}[- ]?\d{3}[- ]?\d{4}/.test(rawScene)) {
    const audioMatch = rawScene.match(/audio:(.*?)\s*\(/i);
    const message = audioMatch ? audioMatch[1].trim() : rawScene.replace(/^scene:\s*/i, '');
    actions.push({ type: 'share.message', target: 'contact', payload: { text: message } });
  }

  if (/\b(sign|menu|text|label|street name)\b/.test(scene) && /(french|spanish|german|japanese|foreign|translate)/.test(scene)) {
    actions.push({ type: 'translate.local', target: 'scene-text', payload: { to: 'en' } });
  }
  if (/\b(lost|which way|turn|exit|platform|gate|navigate)\b/.test(scene)) {
    actions.push({ type: 'navigate.hint', target: 'destination', payload: { hint: 'follow signage to the right' } });
  }
  if (/\b(remember|note|remind|don't forget)\b/.test(scene)) {
    actions.push({ type: 'remember.note', payload: { text: 'noted for later recall' } });
  }
  if (/\b(what is this|identify|what am i looking at)\b/.test(scene)) {
    actions.push({ type: 'identify.object', target: 'foreground' });
  }
  if (/\b(curb|traffic|car coming|watch out|hazard)\b/.test(scene)) {
    actions.unshift({ type: 'hazard.alert', payload: { text: 'watch your step' } });
  }
  if (actions.length === 0) {
    actions.push({ type: 'hud.notice', payload: { text: 'standing by' } });
  }

  const content = '```json\n' + JSON.stringify({ actions }, null, 2) + '\n```';
  return { content, actions, offline: true };
}

class LocalModelClient {
  constructor({ endpoint = OFFLINE, model = 'hermes', fetchImpl, timeoutMs = 8000 } = {}) {
    this.endpoint = endpoint;
    this.model = model;
    this.timeoutMs = timeoutMs;
    this.fetchImpl = fetchImpl || (typeof fetch === 'function' ? fetch : null);
  }

  isOffline() {
    return this.endpoint === OFFLINE || !this.fetchImpl;
  }

  /**
   * Send a chat request. Returns { content, actions, offline, raw? }.
   * `actions` is the parsed tool-call list, ready for the Guardian to screen.
   */
  async chat(messages, { signal } = {}) {
    if (this.isOffline()) {
      return offlineResponder(messages);
    }

    const isOllama = /\/api\/chat$/.test(this.endpoint) || /:11434/.test(this.endpoint);
    const url = isOllama ? this._ollamaUrl() : this._openaiUrl();
    const body = isOllama
      ? { model: this.model, messages, stream: false }
      : { model: this.model, messages, stream: false };

    const controller = typeof AbortController === 'function' ? new AbortController() : null;
    const timer = controller ? setTimeout(() => controller.abort(), this.timeoutMs) : null;

    try {
      const res = await this.fetchImpl(url, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(body),
        signal: signal || (controller && controller.signal)
      });
      if (!res.ok) {
        throw new Error(`local model HTTP ${res.status}`);
      }
      const data = await res.json();
      const content = extractContent(data);
      return { content, actions: parseToolCalls(content), offline: false, raw: data };
    } finally {
      if (timer) clearTimeout(timer);
    }
  }

  _ollamaUrl() {
    return /\/api\/chat$/.test(this.endpoint) ? this.endpoint : this.endpoint.replace(/\/$/, '') + '/api/chat';
  }

  _openaiUrl() {
    return /\/v1\/chat\/completions$/.test(this.endpoint) ? this.endpoint : this.endpoint.replace(/\/$/, '') + '/v1/chat/completions';
  }
}

function extractContent(data) {
  if (!data) return '';
  // Ollama shape
  if (data.message && typeof data.message.content === 'string') return data.message.content;
  // OpenAI-compatible shape
  if (Array.isArray(data.choices) && data.choices[0]) {
    const choice = data.choices[0];
    if (choice.message && typeof choice.message.content === 'string') return choice.message.content;
    if (typeof choice.text === 'string') return choice.text;
  }
  return typeof data.content === 'string' ? data.content : '';
}

module.exports = {
  OFFLINE,
  LocalModelClient,
  parseToolCalls,
  offlineResponder,
  extractContent
};
