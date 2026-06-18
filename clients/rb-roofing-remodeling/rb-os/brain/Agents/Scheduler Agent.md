---
type: agent
application: "[[Scheduler]]"
model: Sonnet 4.6
model_id: claude-sonnet-4-6
hired_by: "[[Allerion Agency]]"
---
# Scheduler Agent

The specialist the [[Allerion Agency]] hires to own [[Scheduler]].

- **Model:** Sonnet 4.6 (`claude-sonnet-4-6`) — chosen per [[../whitelabel-ai-blueprint|model strategy]].
- **Responsibility:** Booking tied to crew capacity, reminders, weather reschedules
- **Config:** `agency/agents/scheduler.agent.yaml`
- **Integrations:** Google Calendar, Outlook Calendar

## Works with
- Hands off to: [[Jobs]]
- Receives from: [[Proposals]]
- Reports to: [[Allerion Agency]] coordinator
