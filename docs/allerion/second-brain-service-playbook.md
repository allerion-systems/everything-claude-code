# Second-Brain Install — Service Playbook

How Allerion turns a client's **legacy files → a searchable digital brain** as a repeatable,
sellable engagement. This productizes what Joey does ad-hoc with the `digital-5d-brain` system
and the DDC converters into a fixed-scope service anyone on the team can deliver.

> The pitch: *"the filing cabinet that talks back."* Every file, photo, estimate, email you've
> ever made — ask it a question, get the answer in seconds. It's also the 60-second sales proof
> (answer one of the client's own questions from their own data, live).

---

## What it is

A done-for-you ingestion of a client's scattered history (Excel, PDFs, BIM/CAD, emails, photos,
notes) into a structured, AI-queryable knowledge graph, installed in *their* accounts, with the
agents that operate over it.

**Built on existing assets — reuse, don't rebuild:**
- `digital-5d-brain/templates/` — project/case-study capture templates (the schema).
- `digital-5d-brain/agents/agent-stack.md` — Portfolio, Estimator, Content, Sales, Research,
  Operator, CFO, Product agents that run over the brain.
- DDC converters in `1_DDC_Toolkit/CAD-Converters` (Revit/IFC/DWG/DGN → Excel) and
  `4_DDC_Curated/Document-Generation` — to parse legacy CAD/PDF/Excel into structured data.
- The 5 dimensions (Identity / Projects / Proof / Products / Agents) as the brain's structure.

---

## The 5-step delivery pipeline

1. **Intake & inventory.** Catalogue what they have and where: drives, email, job software,
   accounting exports, photo libraries, the physical shoebox. Identify the highest-value corpus
   first (usually past estimates + completed jobs).
2. **Normalize & extract.** Run the DDC converters: CAD/BIM → Excel, PDFs → structured text,
   spreadsheets → standardized fields. Map to the `digital-5d-brain` schema (Projects, Proof).
3. **Build the graph.** Load normalized data into the searchable brain; link projects ↔ proof
   ↔ identity. Tag by client, job, date, trade, value.
4. **Wire the agents.** Stand up the relevant agents over the brain (e.g. Estimator for
   scopes/SOVs, Portfolio for case studies, Research for lookups). Configure in the client's
   accounts — data stays theirs.
5. **Handover & demo.** Train the owner on asking it questions; deliver a short SOP + the
   60-second proof on their own data as the "wow" moment.

---

## Intake checklist (run at the audit)

- [ ] Where do files live today? (drives / email / job software / accounting / photos / paper)
- [ ] Rough volume? (hundreds vs. tens of thousands of files → drives the build tier)
- [ ] Most valuable corpus to start? (past estimates / completed jobs / client comms)
- [ ] File types present? (Excel / PDF / Revit / IFC / DWG / images / scans)
- [ ] One question they wish they could ask their own history → that's the demo target.
- [ ] Who owns the accounts the brain installs into?

---

## Deliverables

- A searchable digital brain installed in the client's accounts.
- Normalized, standardized data from their legacy corpus.
- 2–4 working agents (e.g. Estimator, Portfolio/Case-study, Research) over the brain.
- A 1-page SOP: how to ask it things, how to add new files going forward.
- The 60-second proof, recorded, as their first case study.

---

## Pricing (maps to the unified ladder)

See `docs/allerion/business-model-and-market-research.md` §4.

| Tier | Scope | Price |
|------|-------|-------|
| **Personal Brain** | One person, modern files, guided | $49–$199 (self-serve) or light setup |
| **Contractor Brain** | Estimates/scopes/photos/jobs organized | $499–$2,500 |
| **Company Brain (legacy-data build)** | Team-wide, heavy legacy ingestion, agents, SOPs | **$8K–$18K** (legacy ingestion is a premium job — don't undersell it) |
| **Retainer** | Keep ingesting, tune agents, add workflows | $500–$2,500/mo |

> **Margin note:** legacy ingestion is exactly the $15–25K work generalist agencies charge for
> (see market research §3). Scope it as a Company Brain build, not a $3–8K starter.

---

## Why it's the keystone offer

- **Highest-value pain:** "where's that file / I can't find what we quoted" is universal and
  acute in trades.
- **Best demo on earth:** their own data answering their own question — no slide competes.
- **Stickiest retainer:** once the brain holds their history and runs their estimates, they
  don't leave.
- **Product R&D:** every client brain hardens the `digital-5d-brain` system toward ALLERION OS.
