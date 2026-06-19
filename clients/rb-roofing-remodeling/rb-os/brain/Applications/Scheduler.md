---
type: application
brain: OpenAI (GPT)
---
# Scheduler

**Owns:** Booking tied to crew capacity, reminders, reschedules

Part of the [[00-Index|RB-OS]] [[Lead-to-Cash]] pipeline, run by the [[Allerion Agency]].

## Specialist(s)
[[Scheduler Agent]]

## Pipeline position
- **Upstream:** [[Proposals]]
- **Downstream:** [[Jobs]]

## Stack (per [[../ADR-001-orchestration-and-hybrid-brain|ADR-001]])
- **Brain:** OpenAI (GPT)
- **Connectors:** Microsoft 365 (Outlook Calendar), Teams

## Related
- [[R&B Roofing and Remodeling]] · [[Speed-to-Lead]] · [[Lead-to-Cash]]
