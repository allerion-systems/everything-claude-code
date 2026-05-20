#!/usr/bin/env node
// Google Building Measurement MCP server.
// Tools: measure_building, get_roof_insights, capture_satellite_image,
//        capture_street_view, count_openings_in_image, identify_components_in_image.

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
  countOpenings,
  identifyComponents,
} from './measure.js';

function googleKey() {
  const key = process.env.GOOGLE_MAPS_API_KEY;
  if (!key) throw new Error('GOOGLE_MAPS_API_KEY env var is required (must have Geocoding, Static Maps, Street View, and Solar APIs enabled).');
  return key;
}

const TOOLS = [
  {
    name: 'measure_building',
    description: 'Full building takeoff from an address: roof area & segments, gutter lineal feet, footprint, wall square footage, and opening counts (windows/doors/garage doors) from all four sides. Uses Google Solar API, Google Static Maps, Google Street View, and Claude vision.',
    inputSchema: {
      type: 'object',
      properties: {
        address: { type: 'string', description: 'Street address, e.g. "1600 Amphitheatre Pkwy, Mountain View, CA".' },
        headings: { type: 'array', items: { type: 'number' }, description: 'Compass headings (deg) for street-view sweep. Defaults to [0,90,180,270].' },
        assumedStoryHeightFt: { type: 'number', description: 'Story height in feet for wall area estimate. Defaults to 10.' },
      },
      required: ['address'],
    },
  },
  {
    name: 'get_roof_insights',
    description: 'Call the Google Solar API buildingInsights endpoint for an address and return a summarized roof / gutter / footprint breakdown.',
    inputSchema: {
      type: 'object',
      properties: { address: { type: 'string' } },
      required: ['address'],
    },
  },
  {
    name: 'capture_satellite_image',
    description: 'Capture a top-down satellite screenshot centered on the given address. Returns base64 PNG.',
    inputSchema: {
      type: 'object',
      properties: {
        address: { type: 'string' },
        zoom: { type: 'number', description: 'Defaults to 20.' },
      },
      required: ['address'],
    },
  },
  {
    name: 'capture_street_view',
    description: 'Capture a Google Street View screenshot at a given heading (0=N, 90=E, 180=S, 270=W). Returns base64 JPEG.',
    inputSchema: {
      type: 'object',
      properties: {
        address: { type: 'string' },
        heading: { type: 'number', description: 'Defaults to 0 (north).' },
        pitch: { type: 'number', description: 'Defaults to 10 (slightly up).' },
        fov: { type: 'number', description: 'Field of view in degrees. Defaults to 80.' },
      },
      required: ['address'],
    },
  },
  {
    name: 'count_openings_in_image',
    description: 'Run Claude vision on a base64-encoded image of a building facade and return a structured count of windows, doors, garage doors, and other openings.',
    inputSchema: {
      type: 'object',
      properties: {
        base64: { type: 'string', description: 'Base64-encoded image (no data: prefix).' },
        mimeType: { type: 'string', description: 'e.g. image/jpeg or image/png.' },
      },
      required: ['base64', 'mimeType'],
    },
  },
  {
    name: 'identify_components_in_image',
    description: 'Run Claude vision on a base64-encoded satellite or street-view image and return a structured identification of roof, gutters, downspouts, walls, openings, and obstructions.',
    inputSchema: {
      type: 'object',
      properties: {
        base64: { type: 'string' },
        mimeType: { type: 'string' },
      },
      required: ['base64', 'mimeType'],
    },
  },
];

const server = new Server(
  { name: 'google-building-measure', version: '0.1.0' },
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
  switch (name) {
    case 'measure_building': {
      return measureBuilding({
        address: args.address,
        googleApiKey: googleKey(),
        options: {
          headings: args.headings,
          assumedStoryHeightFt: args.assumedStoryHeightFt,
        },
      });
    }
    case 'get_roof_insights': {
      const geo = await geocodeAddress(args.address, googleKey());
      const raw = await getBuildingInsights({ lat: geo.location.lat, lng: geo.location.lng, apiKey: googleKey() });
      return { address: geo.formattedAddress, ...summarizeInsights(raw) };
    }
    case 'capture_satellite_image': {
      const geo = await geocodeAddress(args.address, googleKey());
      const img = await captureSatelliteImage({ lat: geo.location.lat, lng: geo.location.lng, zoom: args.zoom, apiKey: googleKey() });
      return { address: geo.formattedAddress, ...img };
    }
    case 'capture_street_view': {
      const geo = await geocodeAddress(args.address, googleKey());
      const img = await captureStreetView({
        lat: geo.location.lat,
        lng: geo.location.lng,
        heading: args.heading,
        pitch: args.pitch,
        fov: args.fov,
        apiKey: googleKey(),
      });
      return { address: geo.formattedAddress, ...img };
    }
    case 'count_openings_in_image':
      return countOpenings({ base64: args.base64, mimeType: args.mimeType });
    case 'identify_components_in_image':
      return identifyComponents({ base64: args.base64, mimeType: args.mimeType });
    default:
      throw new Error(`Unknown tool: ${name}`);
  }
}

const transport = new StdioServerTransport();
await server.connect(transport);
// eslint-disable-next-line no-console
console.error('google-building-measure MCP server ready (stdio).');
