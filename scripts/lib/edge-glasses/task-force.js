'use strict';

/**
 * The edge glasses agentic task force.
 *
 * A bounded, latency-budgeted multi-agent loop that turns what the wearer sees
 * and hears into safe, on-device actions. Five cooperating roles:
 *
 *   Perception  — sensor frames -> text observations -> scene summary
 *   Guardian    — vets the scene and every planned action (privacy/safety)
 *   Planner     — the local model proposes a bounded plan of tool calls
 *   Action      — executes allowed calls against a registry of local tools
 *   Memory      — appends an episodic trace for later reflection
 *
 * Everything runs against a per-stage millisecond budget and degrades
 * gracefully. Reflexes learned by the reflection loop can short-circuit the
 * planner to stay inside the frame time.
 */

const { LatencyLedger, DEFAULT_STAGE_BUDGETS } = require('./latency-budget');
const { summarizeScene } = require('./perception');
const { screenPlan, VERDICT } = require('./guardrails');
const { sceneSignature } = require('./reflection');

const PLANNER_SYSTEM_PROMPT = [
  'You are the on-device planner for AR glasses running a local Hermes model.',
  'Read the scene and reply with a short JSON plan of at most 3 actions inside a ```json fence.',
  'Each action: { "type": string, "target"?: string, "payload"?: object }.',
  'Prefer safe local actions: translate.local, navigate.hint, remember.note, identify.object, hud.notice, answer.speak.',
  'Never request covert capture. Keep it minimal — the wearer is glancing, not reading.'
].join(' ');

// The local, side-effect-light tools the Action agent can run. Each returns a
// small result object. Real deployments swap these for device services.
const DEFAULT_TOOLS = {
  'translate.local': action => ({ ok: true, text: `«translated» ${textOf(action)}`.trim() }),
  'navigate.hint': action => ({ ok: true, text: (action.payload && action.payload.hint) || 'continue ahead' }),
  'remember.note': action => ({ ok: true, stored: textOf(action) || 'note' }),
  'identify.object': action => ({ ok: true, label: action.target || 'object' }),
  'hud.notice': action => ({ ok: true, text: textOf(action) || '' }),
  'answer.speak': action => ({ ok: true, text: textOf(action) || '' }),
  'hazard.alert': action => ({ ok: true, text: textOf(action) || 'careful' }),
  'share.message': action => ({ ok: true, sent: textOf(action), to: action.target || 'contact' })
};

function textOf(action) {
  return (action && action.payload && action.payload.text) || '';
}

class TaskForce {
  constructor({ model, hub, tools = DEFAULT_TOOLS, stageBudgets = DEFAULT_STAGE_BUDGETS, now = Date.now, reflexIndex = new Map(), memoryLimit = 500 } = {}) {
    if (!model) throw new Error('TaskForce requires a local model client');
    if (!hub) throw new Error('TaskForce requires a perception hub');
    this.model = model;
    this.hub = hub;
    this.tools = tools;
    this.stageBudgets = stageBudgets;
    this.now = now;
    this.reflexIndex = reflexIndex;
    this.memory = [];
    this.memoryLimit = memoryLimit;
  }

  /**
   * Run one perceive -> guard -> plan -> act -> render cycle.
   * frame: sensor slices; context: { attention, grants }.
   * Returns a rich tick record (also appended to episodic memory).
   */
  async tick(frame = {}, context = {}) {
    const ledger = new LatencyLedger(this.stageBudgets, this.now);

    // 1. Perception
    const { observations, skipped } = await ledger.measure('perceive', async () => this.hub.perceive(frame, context));
    const scene = summarizeScene(observations);
    const signature = sceneSignature(scene);

    // 2. Plan — a learned reflex short-circuits the model to save latency.
    let plannedActions;
    let usedReflex = false;
    const reflex = this.reflexIndex.get(signature);
    if (reflex) {
      plannedActions = [reflex.action];
      usedReflex = true;
    } else {
      const planResult = await ledger.measure('plan', async () =>
        this.model.chat([
          { role: 'system', content: PLANNER_SYSTEM_PROMPT },
          { role: 'user', content: scene }
        ])
      );
      plannedActions = (planResult.actions || []).slice(0, 3);
    }

    // 3. Guardian — screen the plan against consent + attention safety.
    const screened = await ledger.measure('guard', async () => screenPlan(plannedActions, context));

    // 4. Action — execute what was allowed (respecting REDACT-sanitized payloads).
    const executed = await ledger.measure('act', async () => {
      const results = [];
      for (const decision of screened.allowed) {
        const action = decision.action;
        const tool = this.tools[action.type];
        const result = tool ? tool(action) : { ok: false, error: `no tool for ${action.type}` };
        results.push({ action, verdict: decision.verdict, result });
      }
      return results;
    });

    const alerts = screened.allowed.filter(d => (d.action.type || '') === 'hazard.alert').map(d => d.action);

    // 5. Render + 6. Memory
    const tickRecord = {
      ts: this.now(),
      attention: context.attention || 'idle',
      scene,
      signature,
      observations,
      skipped,
      usedReflex,
      planned: plannedActions,
      allowed: screened.allowed,
      blocked: screened.blocked,
      deferred: screened.deferred,
      needsConfirm: screened.needsConfirm,
      executed,
      alerts,
      latency: ledger.report()
    };
    this._remember(tickRecord);
    return tickRecord;
  }

  _remember(record) {
    this.memory.push({
      scene: record.scene,
      allowed: record.allowed,
      blocked: record.blocked,
      deferred: record.deferred
    });
    if (this.memory.length > this.memoryLimit) {
      this.memory.splice(0, this.memory.length - this.memoryLimit);
    }
  }

  /**
   * Install reflexes learned by the reflection loop.
   */
  loadReflexes(reflexIndex) {
    this.reflexIndex = reflexIndex;
    return this;
  }
}

module.exports = {
  TaskForce,
  DEFAULT_TOOLS,
  PLANNER_SYSTEM_PROMPT,
  VERDICT
};
