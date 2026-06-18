---
type: agent
application: "[[Jobs]]"
model: Sonnet 4.6
model_id: claude-sonnet-4-6
hired_by: "[[Allerion Agency]]"
---
# Jobs Agent

The specialist the [[Allerion Agency]] hires to own [[Jobs]].

- **Model:** Sonnet 4.6 (`claude-sonnet-4-6`) — chosen per [[../whitelabel-ai-blueprint|model strategy]].
- **Responsibility:** Job status hub, homeowner updates, material lists, photo capture
- **Config:** `agency/agents/jobs.agent.yaml`
- **Integrations:** JobNimbus, Google Drive

## Works with
- Hands off to: [[Billing]]
- Receives from: [[Scheduler]]
- Reports to: [[Allerion Agency]] coordinator
