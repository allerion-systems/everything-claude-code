# Drafting Standards Used by the Plan Generator

What `scripts/hover/generate-plans.js` draws and why, so the agent can
explain sheets to users and extend them consistently.

## Sheet set

| Sheet | Title | Contents |
| --- | --- | --- |
| S-1 | ROOF PLAN | Plane outlines, classified edges, pitch labels, overall dimensions, legend, roof area schedule (plan + slope SF per plane) |
| S-2 | ROOF FRAMING PLAN | Rafter layout per plane at specified o.c. spacing, ridge/hip/valley members with callouts, framing notes |
| S-3 | WALL FRAMING ELEVATIONS & SCHEDULES | Per-facade stud elevations, openings with rough-opening dims, header marks, header schedule, wall notes |
| S-4 | DECK FRAMING PLAN | Ledger, joist layout at specified o.c. spacing, drop beam with posts, guardrail/footing notes per IRC R507 (only when the plan model has a `deck`; select via `--sheets roof,roof-framing,walls,deck`) |

## Formats

- **DXF (R12/AC1009)** — model space, decimal feet, layered; opens in
  AutoCAD, LibreCAD, DraftSight, QCAD, BricsCAD. This is the file to hand a
  drafter or engineer.
- **SVG plot sheet** — ARCH D (36×24 in) landscape with border and title
  block; geometry auto-scaled to the largest standard architectural scale
  that fits (1" … 1/32" = 1'-0"), scale printed in the title block. Print to
  PDF at 100% for a to-scale hard copy.

## Layers

`A-ROOF-OTLN` plane outlines · `A-ROOF-RIDG` ridges (heavy) · `A-ROOF-HIP` /
`A-ROOF-VALL` (dashed) · `A-ROOF-EAVE` / `A-ROOF-RAKE` · `S-FRAM-RAFT`
rafters · `S-FRAM-MEMB` ridge/hip/valley members · `A-WALL` plates/kings ·
`S-STUD` studs · `A-OPNG` openings · `S-HDR` headers · `DIMS` dimensions ·
`ANNO`/`NOTES` text.

## Conventions

- Dimensions in feet-inches to the nearest 1/4" with architectural tick
  marks.
- Roof plan is a true plan projection; slope areas in the schedule =
  plan area × √(1 + (rise/12)²) from the labeled pitch.
- Rafters are drawn perpendicular to each plane's eave (longest eave edge on
  that plane; falls back to the longest side), clipped to the plane polygon.
- Header marks (H1, H2…) are assigned per unique opening type+width; the
  schedule prints size + trimmer/king counts. Sizes come from
  `framing.headers` ([maxWidthFt, callout] pairs) — placeholders unless the
  user supplies values, and always labeled VERIFY.
- Openings HOVER measured but could not locate are distributed evenly and
  flagged `*` (assumed location) in both the elevation and the notes.

## Permit posture (tell the user this)

Sheets carry: "PRELIMINARY DESIGN DOCUMENTS — NOT FOR CONSTRUCTION …
FIELD VERIFY … MUST BE VERIFIED AGAINST THE GOVERNING BUILDING CODE AND,
WHERE REQUIRED BY THE AUTHORITY HAVING JURISDICTION, REVIEWED AND SEALED BY
A LICENSED DESIGN PROFESSIONAL." Many jurisdictions accept
contractor-prepared drawings like these for simple residential work
(reroofs, like-for-like framing); others require an architect/engineer seal.
Never present the set as sealed, and never strip the note.
