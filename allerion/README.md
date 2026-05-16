# Allerion

A portfolio of vertical MCP Apps that render interactive 3D / measurement UIs inside Claude, ChatGPT, and VS Code from a single hosted MCP server.

The first product, **Allerion Measure**, turns a street address into a measurable 3D building model and exports it as IFC (LOD1), glTF, or a measurements PDF — directly inside a chat conversation.

> **Official site**: [`./site/`](./site/) — single-page marketing site with a live in-browser cost calculator. Deploy to Vercel / Netlify / Cloudflare Pages from `./site/`.

## Why this is possible now

The Model Context Protocol shipped the **MCP Apps** extension on 2026-01-26, jointly authored by Anthropic, OpenAI, and community maintainers. MCP Apps let a single tool return interactive HTML/JS that renders inside any MCP-compatible chat surface. One codebase, three distribution channels.

## Architecture

```
allerion/
  src/
    server.ts             MCP server entrypoint (stdio + HTTP transport)
    tools/
      geocode.ts          address -> { lat, lon, country, building_id? }
      fly-to-building.ts  returns Cesium MCP App HTML targeted at address
      measure.ts          receives click points -> distances, areas, slopes
      export-ifc.ts       footprint + height -> IFC2X3 STEP file
    lib/
      geometry.ts         Cartesian / geodesic math (no Cesium dep)
      ifc-builder.ts      Minimal IFC2X3 emitter for extruded buildings
      providers.ts        Google 3D Tiles + OSM Buildings selection
  public/
    viewer.html           MCP App entrypoint - Cesium viewer + tools
    viewer.js             Init, provider switch, camera fly
    measure.js            Click-to-measure (polyline, polygon, vertical)
```

## Setup

```bash
cd allerion
npm install
cp .env.example .env
# fill in MAPBOX_TOKEN (geocode) and optionally GOOGLE_MAPS_API_KEY (3D Tiles)
npm run build
```

### Run modes

```bash
npm run start            # stdio (local MCP clients: Claude Desktop, Cursor, VS Code)
npm run start:http       # Streamable HTTP on :8788/mcp (Claude Apps / marketplace / remote)
npm run start:viewer     # Static viewer + 5D dashboard server on :8787
npm run start:all        # http + viewer (typical hosted deployment)
```

Or use the single CLI: `node dist/cli.js {stdio|http|viewer|all}`.

### Local (stdio) — Claude Desktop, Cursor, VS Code MCP

```json
{
  "mcpServers": {
    "allerion": {
      "command": "node",
      "args": ["/absolute/path/to/allerion/dist/server.js"],
      "env": {
        "MAPBOX_TOKEN": "...",
        "GOOGLE_MAPS_API_KEY": "..."
      }
    }
  }
}
```

### Remote (HTTP) — Claude Apps / hosted

```json
{
  "mcpServers": {
    "allerion": {
      "type": "http",
      "url": "https://your-host.example.com/mcp"
    }
  }
}
```

Health check: `GET /healthz` returns `{ok, name, version, sessions}`.

### Claude Code plugin

This directory is a self-contained Claude Code plugin
(`allerion/.claude-plugin/plugin.json`). When this repo is published to the
Claude Code marketplace it installs the MCP server plus the bundled
`allerion-estimator` subagent, `/allerion` slash command, and `allerion-5d`
skill at the repo root. After install:

```
/allerion 1600 Pennsylvania Ave NW, Washington DC
```

triggers the full autonomous pipeline. The `allerion-estimator` subagent can
also be invoked directly when a task matches its description.

### MCP capabilities exposed

| Capability | Surface |
|---|---|
| **Tools** | `geocode`, `fly_to_building`, `measure`, `auto_takeoff`, `estimate_costs`, `open_5d_dashboard`, `export_ifc` (with `readOnlyHint` / `openWorldHint` / `idempotentHint` annotations) |
| **Prompts** | `estimate-from-address`, `compare-buildings`, `audit-takeoff` |
| **Resources** | `allerion://cost-library/defaults`, `allerion://docs/getting-started`, `allerion://sessions/{id}` (template) |

## Available tools

| Tool | Input | Output |
|---|---|---|
| `geocode` | `{ address }` | `{ lat, lon, normalized_address }` |
| `fly_to_building` | `{ address, provider? }` | Interactive Cesium MCP App centered on the building |
| `measure` | `{ session_id, points[] }` | `{ distance_m, area_m2, vertical_m, slope_deg }` |
| `auto_takeoff` | `{ session_id, address?, roof_material?, facade_material? }` | Autonomously pulls footprint + height from OpenStreetMap, no clicks required |
| `estimate_costs` | `{ session_id, rate_overrides? }` | 5D cost breakdown (material / labor / equipment) per element + totals, live rates from open DDC CWICR API |
| `open_5d_dashboard` | `{ session_id }` | Bexel-style 5D Estimation dashboard as an MCP App (Cesium viewer + totals + table + doughnuts) |
| `export_ifc` | `{ session_id }` | IFC2X3 STEP file text inline |

## Autonomous flow

The "reverse Bexel" loop runs without clicks. In Claude / ChatGPT / VS Code:

```
User: estimate the building at 1600 Pennsylvania Ave

Claude calls:
  1. fly_to_building(address="1600 Pennsylvania Ave NW, Washington DC")
       -> session_id, opens viewer
  2. auto_takeoff(session_id=...)
       -> pulls footprint + 4 stories from OSM Buildings,
          flags missing materials in next_steps
  3. (optionally) looks at the viewer screenshot itself and calls
     auto_takeoff again with roof_material="metal" facade_material="limestone"
  4. estimate_costs(session_id=...)
       -> hits DDC CWICR live API for each element,
          falls back to Allerion defaults when no match,
          returns full 5D breakdown
  5. open_5d_dashboard(session_id=...)
       -> renders the Bexel-style dashboard inline in chat
```

## Cost data source

5D rates come from the open-source [DDC CWICR construction cost
database](https://github.com/datadrivenconstruction/OpenConstructionEstimate-DDC-CWICR)
via their free no-auth REST API at `buildcalculator.io/api/v1/search` (55K+
items, 30 regions, CC-BY-4.0 data licence). Where the API has no
unit-matching result, Allerion falls back to a small hand-curated default rate
table (`src/lib/cost-library.ts`) marked clearly in the dashboard "source"
column. Users can plug in their own RSMeans-style book via the
`rate_overrides` param on `estimate_costs`.

## Provider selection

| Provider | Accuracy | Cost | Coverage |
|---|---|---|---|
| `google-3d-tiles` | ~0.5m photogrammetry mesh | Free <10K tiles/day, then ~$15/1K | Most metro areas worldwide |
| `osm-buildings` | LOD1 extruded footprints | Free | Global, anywhere OSM has building data |

Default is `google-3d-tiles` if `GOOGLE_MAPS_API_KEY` is set, else `osm-buildings`.

## Honest limits

This produces **LOD1/LOD2 measurable geometry**, not full BIM. There are no walls, floors, MEP, or interior — those require LiDAR scans or source BIM files. The IFC export is `IfcBuilding` -> `IfcBuildingStorey` -> `IfcWall` (perimeter walls only) plus a flat or pitched roof. That's enough for:

- Solar installer site reports
- Roofing measurement and quotes
- Insurance loss adjustment footprints
- Real estate appraisal sketches
- Construction quote takeoffs

It is not enough for structural engineering or detailed architectural drawings.

## Roadmap

- **v0**: geocode, fly-to, measure, IFC export
- **v0.0.2** (this PR): auto_takeoff, estimate_costs, open_5d_dashboard - the Bexel-style 5D Estimation dashboard end-to-end
- **v0.1**: Clash detection, pitched roof detection from mesh, polygon snapping to building edges, IFC import via web-ifc
- **v0.2**: 4D scheduling (Gantt + animated construction sequence), Earned Value Analysis, Cash Flow dashboards
- **v0.3**: Hosted SaaS + Stripe metering per estimate
- **v1.0**: Allerion Flightpath (drone planner), Allerion Climate (overlays), Allerion Fleet (multi-site)
