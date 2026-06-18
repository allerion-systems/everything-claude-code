---
type: agent
application: "[[Proposals]]"
model: Opus 4.8
model_id: claude-opus-4-8
hired_by: "[[Allerion Agency]]"
---
# Proposals Agent

The specialist the [[Allerion Agency]] hires to own [[Proposals]].

- **Model:** Opus 4.8 (`claude-opus-4-8`) — chosen per [[../whitelabel-ai-blueprint|model strategy]].
- **Responsibility:** Tiered branded PDF proposal + e-sign + automated follow-up
- **Config:** `agency/agents/proposals.agent.yaml`
- **Integrations:** Google Docs, Gamma, e-sign, QuickBooks (estimate)

## Works with
- Hands off to: [[Scheduler]]
- Receives from: [[Estimator]]
- Reports to: [[Allerion Agency]] coordinator
