// Smoke test for the math + IFC builder + 5D estimator.
// Run with: npx tsx src/smoke-test.ts
import { haversine, polygonAreaM2, polylineLength, trianglePitchDeg } from "./lib/geometry.js";
import { buildIfc } from "./lib/ifc-builder.js";
import { sessionStore } from "./lib/session-store.js";
import { takeoffFromSession } from "./lib/quantity-takeoff.js";
import { defaultRate } from "./lib/cost-library.js";
import { estimateCosts } from "./tools/estimate-costs.js";

function assertClose(label: string, actual: number, expected: number, tolerance: number) {
  const ok = Math.abs(actual - expected) <= tolerance;
  console.log(`${ok ? "PASS" : "FAIL"}  ${label}: got ${actual.toFixed(2)}, expected ~${expected} (±${tolerance})`);
  if (!ok) process.exitCode = 1;
}
function assertTrue(label: string, cond: boolean, detail?: unknown) {
  console.log(`${cond ? "PASS" : "FAIL"}  ${label}`);
  if (!cond) {
    if (detail) console.log("    detail:", detail);
    process.exitCode = 1;
  }
}

// 1-4: math sanity (unchanged)
const nyc = { lon: -74.006, lat: 40.7128 };
const lax = { lon: -118.2437, lat: 34.0522 };
assertClose("haversine NYC->LAX (m)", haversine(nyc, lax), 3_935_000, 50_000);

const a = { lon: 0, lat: 0, height: 0 };
const b = { lon: 100 / 111_320, lat: 0, height: 0 };
assertClose("polyline 100m east at equator", polylineLength([a, b]), 100, 1);

const sq = [
  { lon: 0, lat: 0 },
  { lon: 100 / 111_320, lat: 0 },
  { lon: 100 / 111_320, lat: 100 / 111_320 },
  { lon: 0, lat: 100 / 111_320 },
];
assertClose("polygon 100x100 sq m at equator", polygonAreaM2(sq), 10_000, 50);

const pa = { lon: 0, lat: 0, height: 0 };
const pb = { lon: 10 / 111_320, lat: 0, height: 0 };
const pc = { lon: 10 / 111_320, lat: 10 / 111_320, height: 3.333 };
assertClose("roof pitch ~4:12", trianglePitchDeg(pa, pb, pc), 18.43, 0.5);

// 5: IFC builder
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
const ifcOk =
  ifc.startsWith("ISO-10303-21;") &&
  ifc.trimEnd().endsWith("END-ISO-10303-21;") &&
  ifc.includes("IFCBUILDING(") &&
  ifc.includes("IFCWALLSTANDARDCASE(") &&
  ifc.includes("IFCSLAB(");
assertTrue(`IFC structural sanity (${filename}, ${ifc.length} bytes)`, ifcOk);

// 6: takeoff produces the rows we expect from a known footprint
const SID = "11111111-1111-4111-8111-111111111111";
const s = sessionStore.get(SID);
s.address = "10 Downing St, London";
s.lat = 51.503;
s.lon = -0.127;
s.lastFootprint = [
  { lon: 0, lat: 0, height: 0 },
  { lon: 10 / 111_320, lat: 0, height: 0 },
  { lon: 10 / 111_320, lat: 10 / 111_320, height: 0 },
  { lon: 0, lat: 10 / 111_320, height: 0 },
];
s.lastBuildingHeight = 9; // 3 stories
sessionStore.set(SID, s);

const takeoff = takeoffFromSession(s);
assertTrue("takeoff rows exist", takeoff.rows.length >= 4, takeoff);
const codes = new Set(takeoff.rows.map((r) => r.uniformat_code));
assertTrue(
  "takeoff covers foundation, walls, roof, interiors",
  ["A1010", "B2010", "B3010", "C1010"].every((c) => codes.has(c)),
  [...codes],
);

// 7: default rate book renders sensible totals (no network needed)
const rateB2010 = defaultRate("B2010");
assertTrue(
  "default B2010 rate adds up",
  Math.abs(rateB2010.total - (rateB2010.material + rateB2010.labor + rateB2010.equipment)) < 1,
  rateB2010,
);

// 8: estimate runs end-to-end and totals are positive
const estimate = await estimateCosts({ session_id: SID });
assertTrue(
  `estimate computes positive total ($${estimate.total.toLocaleString()})`,
  estimate.total > 0 && estimate.material > 0 && estimate.labor > 0,
  { total: estimate.total, rowCount: estimate.rows.length },
);
assertTrue(
  "estimate row breakdown sums to header total",
  Math.abs(estimate.rows.reduce((s, r) => s + r.cost_total, 0) - estimate.total) < 1,
);

console.log(process.exitCode ? "\nFAILURES" : "\nALL PASS");
