---
description: Full address-to-priced-estimate pipeline - HOVER measures the property, SketchUp models the design, drawing sheets are produced, and Handoff prices the job. Runs whatever segments have credentials and reports exactly what is blocked.
---

# /estimate-pipeline

Run the full design-build pipeline for: $ARGUMENTS
(expects an address and a scope of work, e.g. "508 Foxwick Ct, Louisville KY 40223 - deck + covered lean-to roof with open gable, $50k budget")

Read the `sketchup-cloud-modeling` skill first. The HOVER and Handoff MCP servers live in
`mcp-servers/` in this repo (see `mcp-servers/README.md` for `claude mcp add` setup).

## Stage 1 - Measure (HOVER)

- `hover_list_jobs` / `hover_get_job` to find an existing capture for the address; if none,
  `hover_create_capture_request` to invite the homeowner/rep to photograph it, then wait for
  the job to reach complete.
- Pull `hover_get_measurements format=json` (dimensions for design + drawings) and
  `format=skp` (the SketchUp model of the existing house).
- No HOVER credentials? Fall back to client-provided measurements/exports and say so.

## Stage 2 - Design (SketchUp)

- Follow the `sketchup-cloud-modeling` skill / `sketchup-modeler` agent: build existing
  conditions from the HOVER data, then the proposed design per client intent.
- Save the combined preview .skp and the proposed-only insert .skp.

## Stage 3 - Drawings

- Produce the permit sheet set per `/sketchup-design` stage 3 (matplotlib sheets from the
  verified coordinates; one script per sheet; merged PDF).

## Stage 4 - Price (Handoff)

- `handoff_create_estimate` with `type: "BLUEPRINT"`, `file_paths: [<merged permit set PDF>]`,
  `address` from the project, and `prompt` = the scope of work. Handoff's AI reads the
  drawings and produces a priced material + labor estimate.
- Poll `handoff_get_estimate` until complete; for scope-only quick numbers (no drawings yet),
  use `type: "MATERIAL_LIST"` with just the prompt + address.

## Delivery

Send the user: the estimate summary with totals, the permit-set PDF, both .skp files, and a
plain-English list of anything blocked (missing credential, pending HOVER capture) with the
single user action needed to unblock it.
