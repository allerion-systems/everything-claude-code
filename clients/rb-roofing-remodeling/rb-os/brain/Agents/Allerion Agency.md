---
type: agency
hosted_by: Allerion Systems
coordinator_model: Opus 4.8
---
# Allerion Agency

The hosted brain that makes RB-OS simple: a **coordinator** that hires one specialist agent per
application and delegates work to it. R&B employees never pick an app — they ask, the Agency routes.

## How it hires
Built on Claude **Managed Agents**: the coordinator (`agency/coordinator.agent.yaml`, Opus 4.8)
holds a roster of the specialist agents and delegates each request to the right one.

## The roster
- [[Intake Agent]] · [[Triage Agent]]
- Estimating trio: [[Roofr Agent]] → [[Hover Agent]] → [[Handoff.ai Agent]] (Chief Estimator)
- [[Proposals Agent]] · [[Scheduler Agent]] · [[Jobs Agent]] · [[Billing Agent]] · [[Retention Agent]] · [[Dashboard Agent]]

Hybrid brain (per [[../ADR-001-orchestration-and-hybrid-brain|ADR-001]]): GPT runs the
customer-facing lanes (Intake, Scheduler, Jobs, Retention); Claude runs the reasoning lanes
(Triage, the trio, Proposals, Billing, Dashboard).

## How employees reach it
Through the **MCP server** (`../mcp/`) — one connection, exposed in Obsidian, Claude Desktop, or
R&B's app. See `../agency/README.md` for provisioning.

## Memory
Every specialist reads and writes this [[00-Index|Brain]], so context is shared across people,
apps, and jobs.

## Related
- [[00-Index]]
- [[R&B Roofing and Remodeling]]
