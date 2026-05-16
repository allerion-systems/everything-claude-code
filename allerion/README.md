# Allerion

A portfolio of vertical MCP Apps that render interactive 3D / measurement UIs inside Claude, ChatGPT, and VS Code from a single hosted MCP server.

The first product, **Allerion Measure**, turns a street address into a measurable 3D building model and exports it as IFC (LOD1), glTF, or a measurements PDF — directly inside a chat conversation.

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
npm run dev
```

Add to Claude Desktop / Cursor / VS Code MCP config:

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

## Available tools

| Tool | Input | Output |
|---|---|---|
| `geocode` | `{ address }` | `{ lat, lon, normalized_address }` |
| `fly_to_building` | `{ address, provider? }` | Interactive Cesium MCP App centered on the building |
| `measure` | `{ session_id, points[] }` | `{ distance_m, area_m2, vertical_m, slope_deg }` |
| `export_ifc` | `{ session_id }` | `{ download_url, ifc_text }` |

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

- **v0** (this scaffold): geocode, fly-to, measure, IFC export
- **v0.1**: Pitched roof detection from mesh, polygon snapping to building edges
- **v0.2**: Hosted SaaS + Stripe metering per measurement
- **v1.0**: Allerion Flightpath (drone planner), Allerion Climate (overlays)
