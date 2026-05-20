#!/usr/bin/env node
/**
 * google-building-measure MCP server
 *
 * Tools:
 *   generate_roofr_report       — Full Roofr-style takeoff: roof sqft, 41 facets, lineal
 *                                 feet per edge type, pitch breakdown, material calculator.
 *   get_roof_insights           — Solar API summary only (fast).
 *   get_aerial_view             — 3D Aerial View fly-around video URL.
 *   capture_satellite_image     — Top-down satellite PNG (base64).
 *   capture_street_view         — Street View JPEG at a heading (base64).
 *   analyze_roof_edges          — Vision: classify edges (eave/ridge/hip/valley/rake) and
 *                                 estimate lineal footage from a satellite image.
 *   count_openings_in_image     — Vision: count windows/doors/garage doors on a facade.
 *   identify_components_in_image — Vision: roof shape, gutters, downspouts, walls.
 *   calculate_materials         — Pure math: given measurements, return shingle/material counts.
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';

import {
  measureBuilding,
  geocodeAddress,
  captureSatelliteImage,
  captureStreetView,
  getBuildingInsights,
  summarizeInsights,
  analyzeRoofEdges,
  countOpenings,
  identifyComponents,
  lookupAerialView,
} from './measure.js';

import { calculateMaterials } from './materials.js';

function googleKey() {
  const key = process.env.GOOGLE_MAPS_API_KEY;
  if (!key) {
    throw new Error(
      'GOOGLE_MAPS_API_KEY env var is required. Enable: Geocoding, Maps Static, Street View Static, Solar, Aerial View APIs.',
    );
  }
  return key;
}

// ── Tool schemas ─────────────────────────────────────────────────────────────

const TOOLS = [
  {
    name: 'generate_roofr_report',
    description:
      'Full building takeoff report matching Roofr output. Returns: total roof sqft, facet count, EVERY edge type in lineal feet (eaves/ridges/hips/valleys/rakes/wall flashing/step flashing), pitch breakdown per plane, window & door counts per facade, and a complete material calculator (shingle bundles, ice & water rolls, synthetic underlayment, ridge caps, drip edge, valley metal) at 10/12/15/17/20% waste. Uses Google Solar API + satellite imagery + Street View + Claude vision.',
    inputSchema: {
      type: 'object',
      properties: {
        address: { type: 'string', description: 'Full street address, e.g. "5396 Georgetown Greenville Road, Greenville, IN 47124"' },
        headings: {
          type: 'array',
          items: { type: 'number' },
          description: 'Street View compass headings to shoot (0=N, 90=E, 180=S, 270=W). Defaults to all four.',
        },
        skipStreetView: { type: 'boolean', description: 'Set true to skip Street View (faster, no opening counts).' },
        skipAerialView: { type: 'boolean', description: 'Set true to skip the 3D Aerial View lookup.' },
      },
      required: ['address'],
    },
  },
  {
    name: 'get_roof_insights',
    description:
      'Quick Solar API call only. Returns roof segments with area (sqft), pitch (degrees + /12 ratio), azimuth, and approximated gutter lineal feet. Much faster than generate_roofr_report.',
    inputSchema: {
      type: 'object',
      properties: { address: { type: 'string' } },
      required: ['address'],
    },
  },
  {
    name: 'get_aerial_view',
    description:
      'Returns a Google Aerial View 3D fly-around video URL for the given address. Paste the URL in a browser to watch. Available for most US/EU addresses.',
    inputSchema: {
      type: 'object',
      properties: { address: { type: 'string' } },
      required: ['address'],
    },
  },
  {
    name: 'capture_satellite_image',
    description: 'Capture a top-down satellite image centered on the address. Returns base64 PNG + source URL.',
    inputSchema: {
      type: 'object',
      properties: {
        address: { type: 'string' },
        zoom: { type: 'number', description: 'Map zoom 1-21. Default 20 (building-level).' },
      },
      required: ['address'],
    },
  },
  {
    name: 'capture_street_view',
    description: 'Capture a Google Street View photo at a compass heading. Returns base64 JPEG.',
    inputSchema: {
      type: 'object',
      properties: {
        address: { type: 'string' },
        heading: { type: 'number', description: '0=North, 90=East, 180=South, 270=West. Default 0.' },
        pitch: { type: 'number', description: 'Camera tilt -90 to 90. Default 10.' },
        fov: { type: 'number', description: 'Field of view 1-120 deg. Default 80.' },
      },
      required: ['address'],
    },
  },
  {
    name: 'analyze_roof_edges',
    description:
      'Run Claude vision on a satellite image to classify every roof edge (eave, ridge, hip, valley, rake, wall flashing, step flashing) and estimate lineal footage of each. Returns facet count, predominant pitch, and downspout count.',
    inputSchema: {
      type: 'object',
      properties: {
        base64: { type: 'string', description: 'Base64 image — no data: prefix needed.' },
        mimeType: { type: 'string', description: 'image/png or image/jpeg' },
      },
      required: ['base64', 'mimeType'],
    },
  },
  {
    name: 'count_openings_in_image',
    description:
      'Vision-only: count windows, doors, garage doors, and other openings on a building facade photo. Best with Street View images.',
    inputSchema: {
      type: 'object',
      properties: {
        base64: { type: 'string' },
        mimeType: { type: 'string' },
      },
      required: ['base64', 'mimeType'],
    },
  },
  {
    name: 'identify_components_in_image',
    description:
      'Vision-only: identify roof shape, material, gutters, downspouts, chimneys, skylights, dormers, wall siding, and story count from a satellite or street view image.',
    inputSchema: {
      type: 'object',
      properties: {
        base64: { type: 'string' },
        mimeType: { type: 'string' },
      },
      required: ['base64', 'mimeType'],
    },
  },
  {
    name: 'calculate_materials',
    description:
      'Pure math material calculator. Given roof measurements, returns shingle bundles, starter strip, ice & water shield, synthetic underlayment, ridge caps, drip edge, and valley metal at standard waste percentages (0/10/12/15/17/20/22%). Mirrors Roofr "Material calculations" page.',
    inputSchema: {
      type: 'object',
      properties: {
        totalSqft: { type: 'number', description: 'Total pitched roof area in square feet.' },
        eavesFt: { type: 'number', description: 'Total eave (gutter) lineal feet.' },
        rakesFt: { type: 'number', description: 'Total rake lineal feet.' },
        hipsFt: { type: 'number', description: 'Total hip lineal feet.' },
        ridgesFt: { type: 'number', description: 'Total ridge lineal feet.' },
        valleysFt: { type: 'number', description: 'Total valley lineal feet.' },
        wallFlashingFt: { type: 'number', description: 'Total wall flashing lineal feet.' },
        stepFlashingFt: { type: 'number', description: 'Total step flashing lineal feet.' },
      },
      required: ['totalSqft'],
    },
  },
];

// ── Server setup ─────────────────────────────────────────────────────────────

const server = new Server(
  { name: 'google-building-measure', version: '0.2.0' },
  { capabilities: { tools: {} } },
);

server.setRequestHandler(ListToolsRequestSchema, async () => ({ tools: TOOLS }));

server.setRequestHandler(CallToolRequestSchema, async (req) => {
  const { name, arguments: args = {} } = req.params;
  try {
    const result = await dispatch(name, args);
    return {
      content: [{ type: 'text', text: typeof result === 'string' ? result : JSON.stringify(result, null, 2) }],
    };
  } catch (err) {
    return {
      isError: true,
      content: [{ type: 'text', text: `Error in ${name}: ${err.message}` }],
    };
  }
});

async function dispatch(name, args) {
  const key = googleKey();

  switch (name) {
    case 'generate_roofr_report':
      return measureBuilding({
        address: args.address,
        googleApiKey: key,
        options: {
          headings: args.headings,
          skipStreetView: args.skipStreetView,
          skipAerialView: args.skipAerialView,
        },
      });

    case 'get_roof_insights': {
      const geo = await geocodeAddress(args.address, key);
      const raw = await getBuildingInsights({ lat: geo.location.lat, lng: geo.location.lng, apiKey: key });
      return { address: geo.formattedAddress, ...summarizeInsights(raw) };
    }

    case 'get_aerial_view': {
      const geo = await geocodeAddress(args.address, key);
      return lookupAerialView(geo.formattedAddress, key);
    }

    case 'capture_satellite_image': {
      const geo = await geocodeAddress(args.address, key);
      return captureSatelliteImage({ lat: geo.location.lat, lng: geo.location.lng, zoom: args.zoom, apiKey: key });
    }

    case 'capture_street_view': {
      const geo = await geocodeAddress(args.address, key);
      return captureStreetView({
        lat: geo.location.lat,
        lng: geo.location.lng,
        heading: args.heading,
        pitch: args.pitch,
        fov: args.fov,
        apiKey: key,
      });
    }

    case 'analyze_roof_edges':
      return analyzeRoofEdges({ base64: args.base64, mimeType: args.mimeType });

    case 'count_openings_in_image':
      return countOpenings({ base64: args.base64, mimeType: args.mimeType });

    case 'identify_components_in_image':
      return identifyComponents({ base64: args.base64, mimeType: args.mimeType });

    case 'calculate_materials':
      return calculateMaterials({
        totalSqft: args.totalSqft,
        eavesFt: args.eavesFt ?? 0,
        rakesFt: args.rakesFt ?? 0,
        hipsFt: args.hipsFt ?? 0,
        ridgesFt: args.ridgesFt ?? 0,
        valleysFt: args.valleysFt ?? 0,
        wallFlashingFt: args.wallFlashingFt ?? 0,
        stepFlashingFt: args.stepFlashingFt ?? 0,
      });

    default:
      throw new Error(`Unknown tool: ${name}`);
  }
}

const transport = new StdioServerTransport();
await server.connect(transport);
// eslint-disable-next-line no-console
console.error('google-building-measure MCP v0.2.0 ready (stdio).');
