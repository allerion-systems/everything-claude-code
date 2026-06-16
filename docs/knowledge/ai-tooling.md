# AI Tooling & Repositories — Knowledge Base

> Captured for Allerion Systems. This is a durable reference doc, committed to the
> repo so it's available in future sessions. (Note: it documents user-supplied
> intel — tool claims below are recorded as provided and have not been
> independently verified.)

## Nodes (tools)

| Tool | Domain | Summary | Tags |
| --- | --- | --- | --- |
| **Money Printer Turbo** | Video Generation | Text-to-video pulling royalty-free web footage | Video, API-dependent |
| **Headroom** | Agent Middleware | Proxy between agents and LLMs; strips junk logs/JSON to save tokens (~4.8% median) | Token optimization, Middleware |
| **MarkItDown** (Microsoft) | Data Parsing | Converts PDF/Word/Excel/images → clean markdown for LLM context | Microsoft, Context prep |
| **Odicius** | Local LLM UI | Local, aesthetic ChatGPT/Claude alternative; deep research, galleries, response editing | Local, UI/UX, Privacy |
| **GBrain** | Memory / DB | Postgres-based permanent agent memory; vector embeddings + BM25 ranking | Memory, **Postgres** |
| **WebRite** (Microsoft) | Browser Automation | Low-level automation on **Playwright**; agents read the code tree vs pixel tokens | Playwright, Token optimization |
| **Light Parse** | Local Processing | Fully offline desktop PDF parsing + OCR with layout awareness | **Local (Mac)**, OCR |
| **Compound Engineering Plugin** | Dev Workflows | Directory of 63 agents + 249 coding skills (git hygiene, Rails, etc.) | System instructions |
| **Stop Slop** | Prompt Eng | Strips "AI writing tells" — ⚠️ can be over-aggressive | Formatting |
| **Super Memory** | Memory | Commercial/OSS long-term memory across platforms | Memory, Cross-platform |
| **Taste Skill** | Design | Forces non-default UI/UX; injects polished tropes (Intercom-style) | UI/UX, Design |
| **Understand Anything** | Code Analysis | Visualizes massive repos into readable diagrams | Visualization |
| **Vox CPM** | Audio | SOTA local TTS + voice cloning on consumer Mac (~10 min) | **Local (Mac)**, TTS |

## Edges (relationships)

- `GBrain` **depends on** → Postgres · `WebRite` **depends on** → Playwright
- `Headroom` **and** `WebRite` **share domain** → Token Optimization
- `MarkItDown` + `Light Parse` **feed** → LLM context prep (Light Parse = offline variant)
- `GBrain` + `Super Memory` **share domain** → Agent Memory
- `Taste Skill` + `Compound Engineering Plugin` **share domain** → injected skills/system instructions
- `Odicius` + `Vox CPM` + `Light Parse` **share environment** → Local execution

## Environment priority: local on MacBook Pro

⭐ **Vox CPM**, **Light Parse**, **Odicius** — optimized for local/offline Mac execution (privacy + no API cost).

## SaaS-infra-relevant

`GBrain` (Postgres memory), `Headroom` (token middleware), `WebRite` (cheap browser exec), `MarkItDown` (ingestion) — building blocks for custom SaaS/agent backends.

## Core Takeaways → Development Rules

1. **Audit mega-repos before deployment.** Any large multi-agent/skill bundle (e.g. Compound Engineering's 63 agents / 249 skills) gets reviewed before it touches a deploy path. Skills run with full agent permissions.
2. **Prefer secure middle-layers.** Route agent↔LLM traffic through a vetted proxy (Headroom-style) to control tokens/logs rather than exposing raw payloads.
3. **Favor local processing for sensitive data.** Use offline tools (Light Parse, Vox CPM) over cloud APIs when handling private/client data.
4. **Read architecture with LLMs, write it deliberately.** Lean on analysis/visualization tools (Understand Anything) for comprehension; keep authorship intentional.
