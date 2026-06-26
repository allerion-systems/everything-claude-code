---
description: Connect this session to the Digital 5D Brain (the second brain) — locate it, load its 5 dimensions as context, and answer from / add to it. Use when the user says "connect to my brain", asks the brain a question, or wants to capture something into it.
---

# /brain — Connect to the Digital 5D Brain

Wire this session to Joey/ALLERION's **Digital 5D Brain** so Claude answers *from* it and writes
*into* it using its own conventions. The brain is the second-brain system: "Build your brain once.
Use it forever."

## Usage

```
/brain                      Connect and report what's in the brain (and what's missing)
/brain <question>           Answer the question from the brain's contents
/brain capture <thing>      Save a memory / proof object / product asset into the brain
```

## Step 1 — Locate the brain

Find the `digital-5d-brain/` directory (it lives in the DDC repo, e.g.
`DDC_Skills_for_AI_Agents_in_Construction/digital-5d-brain/`). If it isn't present locally, ask the
user for its path or whether to connect a live source instead (see "Live sources" below). Don't
assume a hardcoded path.

## Step 2 — Load the 5 dimensions

Read what exists and hold it as context (read `README.md` first for the map and build rule):

1. **Identity** (`identity/`) — who Joey is, beliefs, what he's building.
2. **Projects** (`projects/`) — every project/company/job/build touched.
3. **Proof** (`proof/`) — estimates, proposals, photos, drawings, notes, lessons.
4. **Products** (`products/offers.md`) — the free/paid offer ladder.
5. **Agents** (`agents/agent-stack.md`) — the AI teammates that operate over the brain.

Also note `templates/project-case-study-template.md` (capture schema) and
`operating-system/execution-checklist.md` (the daily/weekly rhythm).

## Step 3 — Report the connection honestly

State what's **populated** vs **empty**. The brain is a framework that may be largely unfilled —
if `identity/`, `projects/`, `proof/`, or `knowledge-graph/` are missing/empty, say so plainly and
offer to seed them. Never answer as if the brain is full when it's a skeleton.

## Step 4 — Answer or capture

- **Answer:** respond only from what the brain actually contains; flag anything you're inferring vs
  reading. If the brain lacks the answer, say what's missing and offer to capture it.
- **Capture:** apply the brain's **build rule** — every artifact becomes one of:
  1. a **memory** (what happened), 2. a **proof object** (evidence), 3. a **product asset**
  (teach/sell/automate). Use `templates/project-case-study-template.md` for projects. Write the
  file into the right dimension folder (create it if the map says it should exist).

## Live sources (optional extension)

"My brain" can also mean the user's real files. If they want, connect a live source and index it
into the brain rather than only reading the repo:
- **Google Drive / Gmail** — search/read real docs, then distil into brain notes (memory/proof).
- Treat this as the **Second-Brain Install** service applied to Joey himself (see
  `docs/allerion/second-brain-service-playbook.md`). Confirm before reading personal data, and
  write distilled notes into the brain — don't dump raw files.

## Output

A short "connection report" (what's loaded, what's empty), then either the answer to the question
or confirmation of what was captured and where.
