---
description: Chat-driven construction drawings from HOVER. List/pull any HOVER project and generate permit-ready roof plans, roof framing plans, and wall framing sheets (DXF + printable SVG).
---

# HOVER Command

This command invokes the **construction-drafter** agent to turn HOVER
(hover.to) photogrammetry measurements into a real drawing set through plain
chat. Runs on dependency-free Node scripts — no paid services beyond your
existing HOVER account.

## Usage

```
/hover setup                      # configure HOVER API credentials
/hover status                     # check HOVER + Handoff connection status (all sources)
/hover projects [search]          # list/search your HOVER jobs
/hover pull <job id or address>   # download measurements + CAD artifacts
/hover plans <job id> [specs]     # generate S-1/S-2/S-3 drawing set
/hover model <job id>             # build a live 3D SketchUp model (.skp)
```

Natural language works too: `/hover get me framing plans for the Johnson
reroof, 2x10 rafters at 16 inches`.

## What This Command Does

0. **`/hover status`** invokes the **hover-handoff-admin** agent, which checks
   *every* configured data source (HOVER, and Handoff once it has a public
   API) in one pass — credential status, reachability, and what to do next
   for whichever isn't connected. Use this before `projects`/`pull` if you're
   not sure your credentials are set up.
1. **Find the project** — searches your HOVER account by name/address via
   `scripts/hover/hover-api.js jobs`
2. **Pull at a moment's notice** — downloads job details, summarized/full/
   roof-line measurement JSON, and HOVER's own PDF/DXF/SKP artifacts when the
   deliverable includes them
3. **Adapt measurements** — converts HOVER JSON to the neutral plan model
   (auto when possible, agent-assisted otherwise)
4. **Generate the set** — `scripts/hover/generate-plans.js` produces:
   - **S-1 ROOF PLAN** — classified ridges/hips/valleys/eaves/rakes, pitch
     labels, dimensions, roof area schedule
   - **S-2 ROOF FRAMING PLAN** — rafter layout at your spacing, ridge/hip/
     valley callouts, framing notes
   - **S-3 WALL FRAMING ELEVATIONS & SCHEDULES** — stud layouts, openings,
     header schedule
   Each sheet is emitted as `.dxf` (AutoCAD/LibreCAD/DraftSight) and `.svg`
   (ARCH D title-block sheet — print to PDF at the labeled scale).
5. **Model in SketchUp** (`/hover model`) — the **sketchup-modeler** agent
   feeds deterministic build code from `scripts/hover/sketchup-code.js` into
   the Trimble SketchUp MCP connector and returns a downloadable `.skp`
   (walls with cut openings + sloped roof planes, thumbnail included).
   Requires the free Trimble SketchUp connector enabled on your account.
6. **Report** — areas, pitches, rafter counts, header marks, file paths.

## Framing Specs

Pass specs inline and they override the flagged defaults:

```
/hover plans 1234567 rafters 2x10 @ 24, studs 2x6 @ 16, ridge 2x12, wall height 9
```

Anything you don't specify is drawn with a placeholder value and stamped
VERIFY on the sheet.

## Setup (one time)

Set environment variables (see `docs/HOVER-CONSTRUCTION-DRAWINGS.md` for the
full walkthrough):

- `HOVER_ACCESS_TOKEN` — quickest, or
- `HOVER_CLIENT_ID` + `HOVER_CLIENT_SECRET` + `HOVER_REFRESH_TOKEN` — the
  agent auto-refreshes and caches tokens in `~/.claude/hover-credentials.json`

## Important

Sheets are generated as **preliminary documents**: geometry comes from HOVER
photogrammetry and must be field-verified, and structural member sizes are
your (or your engineer's) inputs. Many jurisdictions accept these directly
for simple residential permits; others require review/seal by a licensed
design professional. The disclaimers on the sheets exist so plan reviewers
see exactly what the documents are.
