#!/usr/bin/env node
/**
 * Address -> as-built site conditions BEFORE the HOVER visit, from free
 * public GIS (no keys, no cost):
 *
 *   1. US Census geocoder      — address -> lat/lon
 *   2. USGS 3DEP (site-topo.js) — terrain elevation grid
 *   3. OpenStreetMap Overpass  — existing building footprint(s)
 *      https://overpass-api.de (community service; be polite: one query)
 *
 * Emits a starter plan model (footprint + assumed walls + roof outline,
 * clearly flagged as a GIS approximation) plus the topo JSON, so drawings
 * and a SketchUp massing/terrain model exist before anyone drives to the
 * site. The HOVER capture later replaces the approximation with measured
 * geometry.
 *
 * Usage:
 *   node scripts/hover/site-scout.js "<address>" [--out dir] [--size 200] [--step 25]
 */

const fs = require('fs');
const path = require('path');
const topoLib = require('./site-topo');

// Public Overpass endpoints, tried in order (the main instance 504s under load)
const OVERPASS_ENDPOINTS = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
  'https://maps.mail.ru/osm/tools/overpass/api/interpreter'
];
const FT_PER_DEG_LAT = 364000;

/** Convert OSM building ways near a point into local-feet footprints. */
function osmToFootprints(osm, lat, lon) {
  const nodes = new Map();
  for (const el of osm.elements || []) {
    if (el.type === 'node') nodes.set(el.id, [el.lon, el.lat]);
  }
  const ftPerDegLon = FT_PER_DEG_LAT * Math.cos((lat * Math.PI) / 180);
  const footprints = [];
  for (const el of osm.elements || []) {
    if (el.type !== 'way' || !el.nodes || el.nodes.length < 4) continue;
    const ring = el.nodes.slice(0, -1).map(id => nodes.get(id)).filter(Boolean);
    if (ring.length < 3) continue;
    const pts = ring.map(([nlon, nlat]) => [
      Number((((nlon - lon) * ftPerDegLon)).toFixed(1)),
      Number((((nlat - lat) * FT_PER_DEG_LAT)).toFixed(1))
    ]);
    const cx = pts.reduce((s, p) => s + p[0], 0) / pts.length;
    const cy = pts.reduce((s, p) => s + p[1], 0) / pts.length;
    footprints.push({
      id: el.id,
      tags: el.tags || {},
      distFt: Math.hypot(cx, cy),
      footprint: pts.map(p => [Number((p[0] - cx).toFixed(1)), Number((p[1] - cy).toFixed(1))])
    });
  }
  footprints.sort((a, b) => a.distFt - b.distFt);
  return footprints;
}

async function fetchFootprints(lat, lon, radiusFt = 120) {
  const radiusM = Math.round(radiusFt * 0.3048);
  const query = `[out:json][timeout:25];way(around:${radiusM},${lat},${lon})["building"];(._;>;);out;`;
  let lastErr;
  for (const endpoint of OVERPASS_ENDPOINTS) {
    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          // Overpass usage policy requires an identifying User-Agent
          'User-Agent': 'everything-claude-code-site-scout/1.0 (construction pre-visit planning)'
        },
        body: `data=${encodeURIComponent(query)}`
      });
      if (!res.ok) throw new Error(`Overpass HTTP ${res.status} (${endpoint})`);
      return osmToFootprints(await res.json(), lat, lon);
    } catch (err) {
      lastErr = err;
    }
  }
  throw lastErr;
}

function starterPlanModel(address, footprint) {
  return {
    project: {
      name: 'SITE SCOUT - AS-BUILT APPROXIMATION (PUBLIC GIS)',
      address,
      jobId: '',
      date: ''
    },
    roof: {
      // Roof geometry is unknown until the HOVER capture: use the footprint
      // as a single outline plane so the roof plan reads as an outline.
      planes: [{ id: 'A', pitch: '', vertices: footprint }],
      edges: []
    },
    walls: { footprint, height: 9 },
    scout: {
      source: 'OpenStreetMap building footprint + USGS 3DEP topo',
      note: 'APPROXIMATION - replace with HOVER measurements before permit drawings'
    }
  };
}

function parseArgs(argv) {
  const args = { _: [] };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--size' || a === '--step') args[a.slice(2)] = Number(argv[++i]);
    else if (a === '--out') args.out = argv[++i];
    else args._.push(a);
  }
  return args;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const address = args._.join(' ');
  if (!address) {
    console.error('Usage: node scripts/hover/site-scout.js "<address>" [--out dir] [--size ft] [--step ft]');
    process.exit(2);
  }
  try {
    const geo = await topoLib.geocode(address);
    console.log(`Geocoded: ${geo.matched} -> ${geo.lat}, ${geo.lon}`);

    const outDir = args.out || path.join('site-scout', address.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 60));
    fs.mkdirSync(outDir, { recursive: true });

    const topo = await topoLib.sampleTopo({ lat: geo.lat, lon: geo.lon, sizeFt: args.size || 200, stepFt: args.step || 25 });
    topo.address = geo.matched;
    fs.writeFileSync(path.join(outDir, 'site-topo.json'), JSON.stringify(topo, null, 1));
    const zs = topo.grid.flat();
    console.log(`Topo: ${topo.rows}x${topo.cols} grid @ ${topo.stepFt}ft, datum ${topo.datumFt}ft, relief ${Math.min(...zs)} to +${Math.max(...zs)}ft -> ${path.join(outDir, 'site-topo.json')}`);

    let buildings = [];
    try {
      buildings = await fetchFootprints(geo.lat, geo.lon);
    } catch (err) {
      console.log(`OSM footprint lookup failed (${err.message}) - continuing with topo only.`);
    }
    if (buildings.length > 0) {
      const main0 = buildings[0];
      const model = starterPlanModel(geo.matched, main0.footprint);
      fs.writeFileSync(path.join(outDir, 'plan-model.json'), JSON.stringify(model, null, 1));
      const area = Math.abs(main0.footprint.reduce((s, p, i, a) => {
        const q = a[(i + 1) % a.length];
        return s + p[0] * q[1] - q[0] * p[1];
      }, 0) / 2);
      console.log(`Footprint: ${main0.footprint.length} corners, ~${area.toFixed(0)} SF (OSM way ${main0.id}${main0.tags.building ? `, building=${main0.tags.building}` : ''}) -> ${path.join(outDir, 'plan-model.json')}`);
      if (buildings.length > 1) {
        console.log(`(${buildings.length - 1} other structures nearby - garages/sheds/decks may be among them)`);
      }
      console.log('\nNext:');
      console.log(`  node scripts/hover/generate-plans.js ${path.join(outDir, 'plan-model.json')} --out ${path.join(outDir, 'drawings')}`);
      console.log(`  node scripts/hover/sketchup-code.js ${path.join(outDir, 'plan-model.json')} --topo ${path.join(outDir, 'site-topo.json')} --out ${path.join(outDir, 'build.py')}`);
    } else {
      console.log('No OSM building footprint found at this address - topo only. HOVER capture (or manual footprint) needed for the building.');
    }
    console.log('\nNOTE: GIS footprints/terrain are approximations for pre-visit planning - the HOVER capture is the measured source of truth.');
  } catch (err) {
    console.error(err.message);
    process.exit(1);
  }
}

if (require.main === module) main();

module.exports = { osmToFootprints, fetchFootprints, starterPlanModel };
