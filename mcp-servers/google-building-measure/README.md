# google-building-measure (MCP server) v0.2

**Give it an address → get a Roofr-style roof report instantly.**

Connect this server to Claude Desktop or ChatGPT and simply say:

> "Run generate_roofr_report on 5396 Georgetown Greenville Road, Greenville IN 47124"

You get back a structured JSON report that mirrors a professional Roofr PDF:

| Field | Source |
|-------|--------|
| Total roof area (sqft) | Google Solar API |
| Total facets (planes) | Solar API + Claude vision |
| **Eaves** lineal ft (gutter line) | Claude vision on satellite |
| **Ridges** lineal ft | Claude vision on satellite |
| **Hips** lineal ft | Claude vision on satellite |
| **Valleys** lineal ft | Claude vision on satellite |
| **Rakes** lineal ft | Claude vision on satellite |
| Wall flashing / Step flashing | Claude vision on satellite |
| Pitch per plane (e.g. 12/12) | Solar API |
| 3D Aerial View fly-around | Google Aerial View API |
| Windows / Doors / Garage doors | Claude vision on Street View |
| Shingle bundles (w/ waste %) | Material calculator |
| Ice & water shield rolls | Material calculator |
| Synthetic underlayment rolls | Material calculator |
| Ridge cap bundles | Material calculator |
| Drip edge pieces | Material calculator |
| Valley metal pieces | Material calculator |

---

## APIs used

You need **one Google Cloud API key** with these 5 APIs enabled, plus an Anthropic key:

| API | What it does |
|-----|-------------|
| **Geocoding API** | Converts the address to lat/lng |
| **Maps Static API** | Downloads the satellite overhead image |
| **Street View Static API** | Downloads 4 facade photos |
| **Solar API** | Returns roof segment areas, pitches, footprint |
| **Aerial View API** | Returns 3D building fly-around video |

---

## Setup (step by step, no coding required)

### 1 — Get a Google API Key

1. Go to [console.cloud.google.com](https://console.cloud.google.com)
2. Create a project → **APIs & Services → Library**
3. Enable these 5 APIs:
   - `Geocoding API`
   - `Maps Static API`
   - `Street View Static API`
   - `Solar API`
   - `Aerial View API`
4. **APIs & Services → Credentials → Create Credentials → API Key**
5. Copy the key (starts with `AIza...`)

> Google gives $200/month free credit. A single full report costs roughly $0.05–0.15.

### 2 — Get an Anthropic API Key

1. Go to [console.anthropic.com](https://console.anthropic.com)
2. Sign in → **API Keys → Create Key**
3. Copy the key (starts with `sk-ant-...`)

### 3 — Install the server

Open a Terminal (Mac: Cmd+Space → "Terminal"; Windows: search "Command Prompt"):

```bash
# Navigate to this folder
cd /path/to/everything-claude-code/mcp-servers/google-building-measure

# Install dependencies
npm install
```

### 4 — Connect to Claude Desktop

Open (or create) the Claude Desktop config file:

- **Mac**: `~/Library/Application Support/Claude/claude_desktop_config.json`
- **Windows**: `%APPDATA%\Claude\claude_desktop_config.json`

Add this block (replace the paths and keys):

```json
{
  "mcpServers": {
    "google-building-measure": {
      "command": "node",
      "args": ["/FULL/PATH/TO/mcp-servers/google-building-measure/src/index.js"],
      "env": {
        "GOOGLE_MAPS_API_KEY": "AIzaSy...",
        "ANTHROPIC_API_KEY": "sk-ant-..."
      }
    }
  }
}
```

Restart Claude Desktop. You'll see the 🔌 tools icon — the server is connected.

### 5 — Use it

Just type to Claude:

```
Run generate_roofr_report on 5396 Georgetown Greenville Road, Greenville IN 47124
```

Claude will call all the APIs and return a report matching the Roofr format.

---

## Tools reference

| Tool | What it does |
|------|-------------|
| `generate_roofr_report` | **Main tool.** Full takeoff: edge lengths, facets, pitches, materials, openings. |
| `get_roof_insights` | Fast: Solar API only (no vision, no Street View). |
| `get_aerial_view` | Returns 3D fly-around video URL — paste in browser to view. |
| `capture_satellite_image` | Downloads top-down satellite PNG. |
| `capture_street_view` | Downloads Street View JPEG at any heading. |
| `analyze_roof_edges` | Vision-only: send an image, get edge type measurements back. |
| `count_openings_in_image` | Vision-only: count windows/doors/garage doors. |
| `identify_components_in_image` | Vision-only: roof shape, gutters, downspouts, siding. |
| `calculate_materials` | Math-only: paste measurements, get material counts. |

---

## Example output structure

```jsonc
{
  "summary": {
    "totalRoofAreaSqft": 6140,
    "totalFacets": 41,
    "predominantPitch": "12/12"
  },
  "lengths": {
    "eaves":       { "ft": 363.2, "formatted": "363ft 2in", "note": "Gutter line" },
    "ridges":      { "ft": 143.2, "formatted": "143ft 2in" },
    "hips":        { "ft": 223.6, "formatted": "223ft 7in" },
    "valleys":     { "ft": 234.8, "formatted": "234ft 9in" },
    "rakes":       { "ft": 197.3, "formatted": "197ft 3in" },
    "wallFlashing":{ "ft": 74.7,  "formatted": "74ft 8in" },
    "stepFlashing":{ "ft": 131.3, "formatted": "131ft 4in" },
    "hipsAndRidges":{ "ft": 366.7, "formatted": "366ft 8in" },
    "eavesAndRakes":{ "ft": 560.3, "formatted": "560ft 4in" }
  },
  "pitchBreakdown": [
    { "pitch": "12/12", "areaSquareFeet": 5859, "facets": 38 },
    { "pitch": "5/12",  "areaSquareFeet": 270,  "facets": 2 },
    { "pitch": "3/12",  "areaSquareFeet": 12,   "facets": 1 }
  ],
  "materials": {
    "lineItems": {
      "starter": { "coverageLf": 560, "bundles": 6 },
      "iceAndWaterShield": { "rolls": 14 },
      "syntheticUnderlayment": { "rolls": 7 },
      "ridgeCaps": { "bundles": 15 },
      "dripEdge": { "pieces10ft": 57 },
      "valleyMetal": { "pieces10ft": 24 }
    },
    "wasteScenarios": [
      { "wastePercent": 15, "grossSquareFeet": 7061, "shingleBundles": { "GAF Timberline HDZ": 213 } }
    ]
  },
  "aerialView": {
    "covered": true,
    "videoUrls": { "highDef": "https://..." }
  },
  "openings": {
    "totals": { "windows": 14, "doors": 2, "garage_doors": 1 }
  }
}
```

## Caveats

- **Edge lineal footage** comes from Claude vision on a satellite image. Vision confidence is rated `high/medium/low` in the output — always verify `low` results in person.
- **Gutter line = eaves**. The `eaves_ft` field IS the gutter lineal footage.
- **Material counts** are estimates — double-check before ordering.
- **Solar API** coverage is US/EU-heavy. Outside coverage, `get_roof_insights` fails gracefully and vision-only fields still populate.
- **Aerial View** is not available for every address. The tool returns `covered: false` instead of erroring.
