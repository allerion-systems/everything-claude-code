---
type: agent
application: "[[Triage]]"
model: Haiku 4.5
model_id: claude-haiku-4-5
hired_by: "[[Allerion Agency]]"
---
# Triage Agent

The specialist the [[Allerion Agency]] hires to own [[Triage]].

- **Model:** Haiku 4.5 (`claude-haiku-4-5`) — chosen per [[../whitelabel-ai-blueprint|model strategy]].
- **Responsibility:** Classify, score, dedupe, and route every lead with full context
- **Config:** `agency/agents/triage.agent.yaml`
- **Integrations:** JobNimbus, Roofr

## Works with
- Hands off to: [[Estimator]]
- Receives from: [[Intake]]
- Reports to: [[Allerion Agency]] coordinator
