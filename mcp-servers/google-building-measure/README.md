# google-building-measure (MCP server)

A literal "give it an address, get all the numbers" agent. Plug it into Claude / GPT (any MCP-compatible client) and ask for the roof, gutters, walls, and openings of any building.

Powered by:

- **Google Solar API** — `buildingInsights` for roof segments, areas, pitches, azimuths
- **Google Geocoding API** — address → lat/lng
- **Google Static Maps API** — top-down satellite tile
- **Google Street View Static API** — four cardinal facade screenshots
- **Claude vision (Anthropic SDK)** — counts windows/doors/garage doors, identifies roof shape, gutters, downspouts

## Tools exposed

| Tool | What it does |
|------|--------------|
| `measure_building` | One-shot. Address → roof area, gutter lineal ft, footprint, wall sq ft, opening counts. |
| `get_roof_insights` | Just the Solar API summary (roof segments, total area, gutter estimate, footprint). |
| `capture_satellite_image` | Top-down satellite PNG for an address. |
| `capture_street_view` | Street View JPEG at a given heading. |
| `count_openings_in_image` | Vision-only: send an image, get back `{windows, doors, garage_doors, other_openings}`. |
| `identify_components_in_image` | Vision-only: structured `{roof, gutters, downspouts, walls, openings, obstructions}`. |

## Setup

1. Create a Google Cloud project and enable: Geocoding API, Maps Static API, Street View Static API, **Solar API**.
2. `cp .env.example .env` and fill in `GOOGLE_MAPS_API_KEY` + `ANTHROPIC_API_KEY`.
3. Install: `npm install` (from this directory).
4. Add to your client's MCP config:

```json
{
  "mcpServers": {
    "google-building-measure": {
      "command": "node",
      "args": ["/absolute/path/to/mcp-servers/google-building-measure/src/index.js"],
      "env": {
        "GOOGLE_MAPS_API_KEY": "...",
        "ANTHROPIC_API_KEY": "..."
      }
    }
  }
}
```

Then in Claude / GPT:

> Use measure_building on "1600 Amphitheatre Parkway, Mountain View, CA" and give me the takeoff.

## Example output (shape)

```jsonc
{
  "address": { "input": "...", "resolved": "...", "lat": 37.42, "lng": -122.08 },
  "roof": {
    "totalAreaSquareFeet": 2840.5,
    "segmentCount": 6,
    "segments": [
      { "index": 0, "pitchDegrees": 22.5, "azimuthDegrees": 180, "areaSquareFeet": 612.3, "approxPerimeterFeet": 99.8 }
    ]
  },
  "gutters": { "estimatedLinealFeet": 188.2, "method": "sum of approximated eave edges per roof segment" },
  "footprint": { "areaSquareFeet": 2150.0, "approxPerimeterFeet": 186.0 },
  "walls": { "estimatedSquareFeet": 1860, "assumedStoryHeightFeet": 10, "assumedStories": 1 },
  "openings": {
    "totals": { "windows": 14, "doors": 2, "garage_doors": 1, "other_openings": 0 },
    "perSide": [ { "heading": 0, "openings": { "ok": true, "data": { "windows": 4, "doors": 1, "garage_doors": 1, "other_openings": 0 } } } ]
  },
  "componentsFromSatellite": { "ok": true, "data": { "roof": { "shape": "hip", "material_guess": "asphalt shingle" } } }
}
```

## Caveats (read these)

- **Solar API coverage** is U.S./EU-heavy. Outside coverage, `roof`/`gutters`/`footprint` return an error and only the vision-based fields populate.
- **Gutter lineal feet** is an approximation: each roof segment is modeled as a 2:1 rectangle of equal area; the two "long" edges are counted as eaves. Good enough for first-pass estimating; not a substitute for an on-site measurement.
- **Wall square footage** = footprint perimeter × story height × stories (stories guessed from satellite). Does **not** subtract openings.
- **Opening counts** are per-facade vision estimates. Trees, shadows, and Street View angles will under- or over-count. Treat as a starting point.
- **Downspouts** aren't reliably visible from satellite and need ground-level images — currently only surfaced via `identify_components_in_image`, which is best-effort.

## Roadmap (start simple → grow)

- [ ] Use the Solar API `dataLayers` mask to get the actual roof polygon and compute true eave length.
- [ ] Add a Google Earth Studio fly-around step for multi-angle vision passes.
- [ ] Cache geocode + insights by `placeId` so repeat queries are free.
- [ ] Optional Roofr / EagleView passthrough for hard-mode properties.
