---
description: Run an autonomous 5D construction cost estimate for a street address using the Allerion MCP server. Renders a Bexel-style dashboard inline.
---

# Allerion 5D Estimate

Run the full autonomous estimation pipeline for the address the user provides.

## Usage

```
/allerion 1600 Pennsylvania Ave NW, Washington DC
/allerion estimate 350 5th Ave, New York
/allerion compare 100 Main St; 200 Main St; 300 Main St
```

## What to do

1. Parse the address (or comma/semicolon-separated list for `compare`).
2. Delegate to the `allerion-estimator` subagent with the address. The subagent runs:
   - `fly_to_building` to open the Cesium viewer
   - Looks at the viewer to classify materials
   - `auto_takeoff` to pull the OSM footprint
   - `estimate_costs` to price against the live cost API
   - `open_5d_dashboard` to render the result
3. For `compare`, run the subagent once per address, then produce a comparison table:
   - Address | Gross Floor Area | Total Cost | $/ft² | Top Classification
4. Surface the dashboard URLs so the user can interact with each viewer.

## Prerequisites

The `allerion` MCP server must be configured. If the user gets a "tool not found" error, point them at:

```
{
  "mcpServers": {
    "allerion": {
      "command": "node",
      "args": ["/absolute/path/to/allerion/dist/server.js"]
    }
  }
}
```

Or install the `allerion` plugin from the Claude Code marketplace.
