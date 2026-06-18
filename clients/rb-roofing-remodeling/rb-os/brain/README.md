# The Brain — R&B's Obsidian vault

The shared knowledge graph for RB-OS. Interlinked Markdown notes that **both** R&B employees
**and** the Agency's agents read and write.

## Open it
1. Install [Obsidian](https://obsidian.md).
2. **Open folder as vault** → select this `brain/` folder.
3. Open **[[00-Index]]** and turn on **Graph view** (left ribbon, or `Ctrl/Cmd+G`).

You'll see the hub (`00-Index`) at the center, the [[Lead-to-Cash]] pipeline as a chain of
applications, each application linked to its agent and a concept, and every agent linked back
to the [[Allerion Agency]].

## Structure
```
brain/
  00-Index.md          ← graph hub (start here)
  Company/             ← R&B Roofing and Remodeling
  Applications/        ← one note per application (the pipeline)
  Agents/              ← one note per specialist + the Allerion Agency
  Concepts/            ← Speed-to-Lead, Lead-to-Cash
  People/              ← Roles
```

## How the agents use it
The Agency mounts this vault as a shared **memory store** (Claude Managed Agents). Specialists
read the relevant notes for context before acting, and write learnings back — so nothing gets
lost between people, apps, or jobs. Wiring: `../agency/README.md`.

## Conventions
- Link generously with `[[wikilinks]]` — links are what make the graph useful.
- One idea per note; keep notes short.
- Frontmatter `type:` tags notes for color-coding in the graph.
