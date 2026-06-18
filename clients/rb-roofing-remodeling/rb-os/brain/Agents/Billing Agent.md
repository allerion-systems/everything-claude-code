---
type: agent
application: "[[Billing]]"
model: Haiku 4.5
model_id: claude-haiku-4-5
hired_by: "[[Allerion Agency]]"
---
# Billing Agent

The specialist the [[Allerion Agency]] hires to own [[Billing]].

- **Model:** Haiku 4.5 (`claude-haiku-4-5`) — chosen per [[../whitelabel-ai-blueprint|model strategy]].
- **Responsibility:** Invoices, payment links, dunning, financing hand-off
- **Config:** `agency/agents/billing.agent.yaml`
- **Integrations:** QuickBooks, Stripe

## Works with
- Hands off to: [[Retention]]
- Receives from: [[Jobs]]
- Reports to: [[Allerion Agency]] coordinator
