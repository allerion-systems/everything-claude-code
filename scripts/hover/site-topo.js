#!/usr/bin/env node
/**
 * Fetch real site topography for a project address using free public GIS
 * services (no API keys, no cost):
 *
 *   1. US Census Bureau geocoder  — address -> lat/lon
 *      https://geocoding.geo.census.gov/geocoder/
 *   2. USGS 3DEP Elevation Point Query Service — lat/lon -> ground elevation
 *      https://epqs.nationalmap.gov/v1/json
 *
 * Samples an elevation grid centered on the property and writes a compact
 * topo JSON that scripts/hover/sketchup-code.js turns into a SketchUp
 * terrain surface (and that generate-plans.js can cite for grade notes).
 *
 * Usage:
 *   node scripts/hover/site-topo.js "<address>" [--size 200] [--step 25] [--out site-topo.json]
 *   node scripts/hover/site-topo.js --lat 39.78 --lon -89.65 [--size 200] [--step 25]
 *
 * Output (feet; grid z values relative to the center-point datum):
 *   { address, lat, lon, sizeFt, stepFt, cols, rows, datumFt, grid: [[...]] }
 *
 * US coverage only (both services are US federal datasets). Node 18+.
 */

const fs = require('fs');

const GEOCODER = 'https://geocoding.geo.census.gov/geocoder/locations/onelineaddress';
const EPQS = 'https://epqs.nationalmap.gov/v1/json';
const FT_PER_DEG_LAT = 364000; // ~69 miles

/** Grid sample offsets (feet from center), row-major, north (+y) first. */
function gridCoords(sizeFt, stepFt) {
  const half = sizeFt / 2;
  const coords = [];
  for (let y = half; y >= -half; y -= stepFt) {
    const row = [];
    for (let x = -half; x <= half; x += stepFt) row.push([x, y]);
    coords.push(row);
  }
  return coords;
}

/** Convert absolute elevations (row-major, feet) to datum-relative grid. */
function toRelativeGrid(elevations) {
  const rows = elevations.length;
  const cols = elevations[0].length;
  const datum = elevations[Math.floor(rows / 2)][Math.floor(cols / 2)];
  return {
    datumFt: Number(datum.toFixed(2)),
    grid: elevations.map(row => row.map(e => Number((e - datum).toFixed(2))))
  };
}

async function geocode(address) {
  const url = `${GEOCODER}?address=${encodeURIComponent(address)}&benchmark=Public_AR_Current&format=json`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Census geocoder HTTP ${res.status}`);
  const data = await res.json();
  const match = data.result && data.result.addressMatches && data.result.addressMatches[0];
  if (!match) throw new Error(`Address not found by Census geocoder: "${address}"`);
  return { lat: match.coordinates.y, lon: match.coordinates.x, matched: match.matchedAddress };
}

async function elevationAt(lat, lon) {
  const url = `${EPQS}?x=${lon}&y=${lat}&units=Feet&wkid=4326&includeDate=false`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`USGS EPQS HTTP ${res.status}`);
  const data = await res.json();
  const value = Number(data.value);
  if (!Number.isFinite(value) || value < -1000) {
    throw new Error(`No elevation data at ${lat},${lon} (USGS 3DEP covers the US only)`);
  }
  return value;
}

/** Map with bounded concurrency, preserving order of results. */
async function mapLimit(items, limit, fn) {
  const results = new Array(items.length);
  let next = 0;
  const worker = async () => {
    while (next < items.length) {
      const i = next++;
      results[i] = await fn(items[i], i);
    }
  };
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return results;
}

const ELEVATION_CONCURRENCY = 8;

async function sampleTopo({ lat, lon, sizeFt = 200, stepFt = 25 }) {
  const coords = gridCoords(sizeFt, stepFt);
  const ftPerDegLon = FT_PER_DEG_LAT * Math.cos((lat * Math.PI) / 180);
  // Each sample point is independent: query USGS in bounded parallel batches.
  const flat = coords.flat();
  const values = await mapLimit(flat, ELEVATION_CONCURRENCY, ([dxFt, dyFt]) =>
    elevationAt(lat + dyFt / FT_PER_DEG_LAT, lon + dxFt / ftPerDegLon));
  const cols = coords[0].length;
  const elevations = coords.map((row, r) => values.slice(r * cols, (r + 1) * cols));
  const { datumFt, grid } = toRelativeGrid(elevations);
  return { lat, lon, sizeFt, stepFt, cols, rows: coords.length, datumFt, grid };
}

function numericArg(name, raw, { min = -Infinity } = {}) {
  const value = Number(raw);
  if (raw === undefined || raw === '' || !Number.isFinite(value) || value < min) {
    console.error(`Invalid value for ${name}: "${raw}" - expected a number${min > -Infinity ? ` >= ${min}` : ''}`);
    process.exit(2);
  }
  return value;
}

function parseArgs(argv) {
  const args = { _: [] };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--size' || a === '--step') args[a.slice(2)] = numericArg(a, argv[++i], { min: 1 });
    else if (a === '--lat' || a === '--lon') args[a.slice(2)] = numericArg(a, argv[++i]);
    else if (a === '--out') args.out = argv[++i];
    else args._.push(a);
  }
  return args;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  let lat = args.lat, lon = args.lon, address = args._.join(' ') || undefined;
  try {
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
      if (!address) {
        console.error('Usage: site-topo.js "<address>" [--size ft] [--step ft] [--out file]\n       site-topo.js --lat <deg> --lon <deg> [...]');
        process.exit(2);
      }
      const geo = await geocode(address);
      lat = geo.lat; lon = geo.lon;
      console.error(`Geocoded: ${geo.matched} -> ${lat}, ${lon}`);
    }
    const topo = await sampleTopo({ lat, lon, sizeFt: args.size || 200, stepFt: args.step || 25 });
    topo.address = address || '';
    const json = JSON.stringify(topo, null, 1);
    if (args.out) {
      fs.writeFileSync(args.out, json);
      const zs = topo.grid.flat();
      console.error(`Topo grid ${topo.rows}x${topo.cols} @ ${topo.stepFt}ft -> ${args.out}`);
      console.error(`Datum ${topo.datumFt} ft; relief ${Math.min(...zs)} to +${Math.max(...zs)} ft across the site.`);
    } else {
      process.stdout.write(json + '\n');
    }
  } catch (err) {
    console.error(err.message);
    process.exit(1);
  }
}

if (require.main === module) main();

module.exports = { gridCoords, toRelativeGrid, geocode, elevationAt, sampleTopo };
