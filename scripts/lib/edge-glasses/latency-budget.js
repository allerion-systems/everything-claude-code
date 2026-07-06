'use strict';

/**
 * Latency budgets for the edge glasses runtime.
 *
 * Wearables are unforgiving: a heads-up assistant that answers late is worse
 * than one that answers less. Every stage of a perceive -> plan -> act tick
 * runs against a millisecond budget, and the task force degrades gracefully
 * (drops optional stages) rather than blowing the frame time.
 *
 * Pure and deterministic — the clock is injectable so tests never flake.
 */

// Default per-stage budgets in milliseconds. Tuned for a ~1.2s glance loop.
const DEFAULT_STAGE_BUDGETS = {
  perceive: 250,
  guard: 60,
  plan: 500,
  act: 300,
  render: 90
};

function totalBudget(stageBudgets) {
  return Object.values(stageBudgets).reduce((sum, ms) => sum + ms, 0);
}

/**
 * Records how long each stage actually took and compares it to the budget.
 * `now` defaults to Date.now but can be injected for deterministic tests.
 */
class LatencyLedger {
  constructor(stageBudgets = DEFAULT_STAGE_BUDGETS, now = Date.now) {
    this.stageBudgets = { ...stageBudgets };
    this.now = now;
    this.entries = [];
    this._open = null;
  }

  start(stage) {
    this._open = { stage, startedAt: this.now() };
    return this._open;
  }

  stop() {
    if (!this._open) return null;
    const ended = this.now();
    const entry = {
      stage: this._open.stage,
      ms: ended - this._open.startedAt,
      budget: this.stageBudgets[this._open.stage] ?? null
    };
    entry.overBudget = entry.budget !== null && entry.ms > entry.budget;
    this.entries.push(entry);
    this._open = null;
    return entry;
  }

  /**
   * Time an async function against a stage budget and record the result.
   */
  async measure(stage, fn) {
    this.start(stage);
    try {
      return await fn();
    } finally {
      this.stop();
    }
  }

  totalMs() {
    return this.entries.reduce((sum, e) => sum + e.ms, 0);
  }

  /**
   * True while there is still budget headroom for an optional stage. The task
   * force calls this before running non-critical work (e.g. reflection).
   */
  hasHeadroom(stage) {
    const budget = this.stageBudgets[stage];
    if (budget === undefined) return true;
    return this.totalMs() + budget <= totalBudget(this.stageBudgets);
  }

  worstStage() {
    if (this.entries.length === 0) return null;
    return this.entries.reduce((worst, e) => {
      const overshoot = e.budget === null ? -Infinity : e.ms - e.budget;
      const worstOvershoot = worst.budget === null ? -Infinity : worst.ms - worst.budget;
      return overshoot > worstOvershoot ? e : worst;
    });
  }

  report() {
    const total = this.totalMs();
    const budget = totalBudget(this.stageBudgets);
    return {
      total,
      budget,
      withinBudget: total <= budget,
      overBudgetStages: this.entries.filter(e => e.overBudget).map(e => e.stage),
      stages: this.entries.slice()
    };
  }
}

module.exports = {
  DEFAULT_STAGE_BUDGETS,
  totalBudget,
  LatencyLedger
};
