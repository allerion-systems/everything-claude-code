// Smoke test for the math + IFC builder. Run with: npx tsx src/smoke-test.ts
import { haversine, polygonAreaM2, polylineLength, trianglePitchDeg } from "./lib/geometry.js";
import { buildIfc } from "./lib/ifc-builder.js";

function assertClose(label: string, actual: number, expected: number, tolerance: number) {
  const ok = Math.abs(actual - expected) <= tolerance;
  const status = ok ? "PASS" : "FAIL";
  console.log(`${status}  ${label}: got ${actual.toFixed(2)}, expected ~${expected} (±${tolerance})`);
  if (!ok) process.exitCode = 1;
}

// 1. Haversine: NYC -> LAX is ~3935 km
const nyc = { lon: -74.006, lat: 40.7128 };
const lax = { lon: -118.2437, lat: 34.0522 };
assertClose("haversine NYC->LAX (m)", haversine(nyc, lax), 3_935_000, 50_000);

// 2. Polyline: walk 100m east at the equator
const a = { lon: 0, lat: 0, height: 0 };
const b = { lon: 100 / 111_320, lat: 0, height: 0 };
assertClose("polyline 100m east at equator", polylineLength([a, b]), 100, 1);

// 3. Polygon: a 100m x 100m square at the equator = 10000 m²
const sq = [
  { lon: 0, lat: 0 },
  { lon: 100 / 111_320, lat: 0 },
  { lon: 100 / 111_320, lat: 100 / 111_320 },
  { lon: 0, lat: 100 / 111_320 },
];
assertClose("polygon 100x100 sq m at equator", polygonAreaM2(sq), 10_000, 50);

// 4. Pitch: a 4:12 roof slope = atan(4/12) = 18.43°
//    From a point (0,0,0) to (10m east, 0, 0) to (10m east, 10m north, ~3.33m up).
//    The 3 points form a triangle whose plane is tilted by atan(3.33/10) ≈ 18.43°.
const pa = { lon: 0, lat: 0, height: 0 };
const pb = { lon: 10 / 111_320, lat: 0, height: 0 };
const pc = { lon: 10 / 111_320, lat: 10 / 111_320, height: 3.333 };
assertClose("roof pitch ~4:12", trianglePitchDeg(pa, pb, pc), 18.43, 0.5);

// 5. IFC builder: 10x10 footprint, 8m tall. File should be valid STEP text.
const { ifc, filename } = buildIfc({
  footprint: [
    { lon: 0, lat: 0 },
    { lon: 10 / 111_320, lat: 0 },
    { lon: 10 / 111_320, lat: 10 / 111_320 },
    { lon: 0, lat: 10 / 111_320 },
  ],
  heightM: 8,
  name: "Smoke Test Building",
  address: "123 Test St",
});
const startsOk = ifc.startsWith("ISO-10303-21;");
const endsOk = ifc.trimEnd().endsWith("END-ISO-10303-21;");
const hasBldg = ifc.includes("IFCBUILDING(");
const hasWall = ifc.includes("IFCWALLSTANDARDCASE(");
const hasRoof = ifc.includes("IFCSLAB(");
const ok = startsOk && endsOk && hasBldg && hasWall && hasRoof;
console.log(`${ok ? "PASS" : "FAIL"}  IFC structural sanity (${filename}, ${ifc.length} bytes)`);
if (!ok) {
  console.log({ startsOk, endsOk, hasBldg, hasWall, hasRoof });
  process.exitCode = 1;
}

console.log(process.exitCode ? "\nFAILURES" : "\nALL PASS");
