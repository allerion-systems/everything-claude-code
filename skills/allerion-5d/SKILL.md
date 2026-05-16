---
name: allerion-5d
description: Allerion 5D Estimation workflow - take a street address and produce a Bexel-style construction cost dashboard with material/labor/equipment splits, IFC export, and an interactive Cesium viewer. Trigger when the user asks for a construction cost estimate, building takeoff, square-foot pricing, BIM model from an address, IFC export, roofing/solar quote sketch, insurance footprint, or real-estate appraisal sketch.
---

# Allerion 5D Estimation

Reverse-engineers the Bexel Manager 5D Estimation dashboard as an open MCP App: address → autonomous OpenStreetMap takeoff → live cost API pricing → Cesium 3D viewer + cost breakdown inline in chat. Open source, no enterprise license.

## When to use

Trigger this skill when the user asks for:

- A construction cost estimate from an address ("how much would it cost to build…")
- A building takeoff or quantity survey
- A 5D dashboard, BIM model, or IFC export
- A solar installer site report, roofing quote sketch, insurance loss footprint, real-estate appraisal
- "Reverse-engineer Bexel", "open IFC pipeline", or anything mentioning UniFormat/MasterFormat at sketch fidelity

Don't trigger for: detailed structural engineering, code compliance, MEP design, or binding procurement quotes. Allerion produces LOD1/LOD2 sketches, not contract-grade BIM.

## How it works

```
┌─ user: "estimate 350 5th Ave NYC" ─┐
│                                     │
│  1. fly_to_building(address)        │  → opens Cesium viewer inline
│  2. (look at viewer screenshot)     │  → infer roof + facade materials
│  3. auto_takeoff(materials…)        │  → OSM footprint + levels
│  4. estimate_costs(session_id)      │  → live DDC CWICR API + defaults
│  5. open_5d_dashboard(session_id)   │  → Bexel-style dashboard
└─────────────────────────────────────┘
```

The whole loop runs without user clicks when OSM has the building. When OSM is empty, `auto_takeoff` returns a 10m square fallback and flags it — surface that warning before pricing.

## Tools (provided by the `allerion` MCP server)

| Tool | Purpose |
|---|---|
| `geocode` | Address → lat/lon (Mapbox or OSM Nominatim) |
| `fly_to_building` | Open Cesium viewer, create session |
| `measure` | Manual click-to-measure (polyline, polygon, vertical, pitch) |
| `auto_takeoff` | Autonomous OSM-based geometry extraction |
| `estimate_costs` | 5D cost breakdown with live + default rates |
| `open_5d_dashboard` | Bexel-style dashboard MCP App |
| `export_ifc` | IFC2X3 STEP file for any IFC viewer |

## Prompts (reusable workflows)

The MCP server exposes three prompts the user/agent can invoke directly:

- `estimate-from-address` — the full pipeline for a single address
- `compare-buildings` — side-by-side 5D for multiple addresses
- `audit-takeoff` — critically review quantities before pricing

## Resources (live data)

- `allerion://cost-library/defaults` — the default rate book (JSON)
- `allerion://docs/getting-started` — full README
- `allerion://sessions/{id}` — live session state for any session

## Examples

**Single estimate**

> User: "What would it cost to build something like the Empire State Building?"
>
> Agent: Calls `fly_to_building("Empire State Building, NYC")`, sees the viewer, identifies limestone facade + flat membrane roof, calls `auto_takeoff(materials)`, `estimate_costs`, `open_5d_dashboard`. Reports total + $/ft² + top driver + confidence.

**Comparison**

> User: "Compare construction costs for 100 / 200 / 300 Main St"
>
> Agent: Runs the pipeline three times, produces a markdown comparison table, surfaces three dashboard URLs.

**Audit before pricing**

> User: "Estimate the cost for my new warehouse design at 500 Industrial Way, but double-check the quantities first."
>
> Agent: Invokes the `audit-takeoff` prompt against the session, reviews the takeoff for sanity, flags issues, then runs `estimate_costs`.

## Honest limits

LOD1 takeoff: one row per element class (foundation, exterior walls, floors, roof, interior partitions). Not per-wall, no MEP, no windows/doors as discrete elements. Multi-element BIM needs real IFC import via `web-ifc` (v0.1 roadmap).

Default rates are rough placeholders flagged in the dashboard's "source" column. Live API match quality varies — strict unit filtering keeps obvious junk out (Soviet-era labor-only entries) but doesn't guarantee a perfect match. Always surface live-vs-default ratio in summary.
