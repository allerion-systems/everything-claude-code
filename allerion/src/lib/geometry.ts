// Geodesic + planar geometry helpers. No Cesium dependency on the server side -
// the heavy lifting happens in the browser viewer; the server only needs to
// validate point arrays and produce summary measurements + IFC footprints.

export interface LngLat {
  lon: number;
  lat: number;
}

export interface Point3D extends LngLat {
  height: number;
}

const EARTH_RADIUS_M = 6_378_137;

const toRad = (deg: number) => (deg * Math.PI) / 180;

/** Great-circle distance in metres between two lon/lat points. */
export function haversine(a: LngLat, b: LngLat): number {
  const dLat = toRad(b.lat - a.lat);
  const dLon = toRad(b.lon - a.lon);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);

  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.sin(dLon / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2);
  return 2 * EARTH_RADIUS_M * Math.asin(Math.sqrt(h));
}

/** 3D distance between two points including elevation. */
export function distance3D(a: Point3D, b: Point3D): number {
  const flat = haversine(a, b);
  const dh = b.height - a.height;
  return Math.sqrt(flat * flat + dh * dh);
}

/** Sum of polyline segment lengths in metres. */
export function polylineLength(points: Point3D[]): number {
  let total = 0;
  for (let i = 1; i < points.length; i++) {
    total += distance3D(points[i - 1]!, points[i]!);
  }
  return total;
}

/**
 * Area of a polygon defined by lon/lat points, in square metres.
 * Uses the spherical excess formula (Girard's theorem) - accurate enough
 * for building-scale footprints (sub-1% error up to several km).
 */
export function polygonAreaM2(points: LngLat[]): number {
  if (points.length < 3) return 0;
  let total = 0;
  for (let i = 0; i < points.length; i++) {
    const p1 = points[i]!;
    const p2 = points[(i + 1) % points.length]!;
    total +=
      toRad(p2.lon - p1.lon) *
      (2 + Math.sin(toRad(p1.lat)) + Math.sin(toRad(p2.lat)));
  }
  return Math.abs((total * EARTH_RADIUS_M * EARTH_RADIUS_M) / 2);
}

/**
 * Pitch / slope of a triangle defined by three 3D points, in degrees.
 * Used to estimate roof pitch from three clicked roof points.
 */
export function trianglePitchDeg(a: Point3D, b: Point3D, c: Point3D): number {
  // Convert to a local east-north-up tangent plane at point a.
  const ref = a;
  const mPerDegLat = 111_320;
  const mPerDegLon = 111_320 * Math.cos(toRad(ref.lat));

  const local = (p: Point3D) => ({
    x: (p.lon - ref.lon) * mPerDegLon,
    y: (p.lat - ref.lat) * mPerDegLat,
    z: p.height - ref.height,
  });

  const A = local(a);
  const B = local(b);
  const C = local(c);

  const u = { x: B.x - A.x, y: B.y - A.y, z: B.z - A.z };
  const v = { x: C.x - A.x, y: C.y - A.y, z: C.z - A.z };

  // Normal = u x v
  const n = {
    x: u.y * v.z - u.z * v.y,
    y: u.z * v.x - u.x * v.z,
    z: u.x * v.y - u.y * v.x,
  };
  const mag = Math.sqrt(n.x * n.x + n.y * n.y + n.z * n.z);
  if (mag === 0) return 0;
  // Angle between plane normal and vertical (z axis).
  const cos = Math.abs(n.z) / mag;
  return (Math.acos(cos) * 180) / Math.PI;
}

/** Bounding box of a point cloud in lon/lat plus min/max height. */
export function bbox(points: Point3D[]) {
  const lons = points.map((p) => p.lon);
  const lats = points.map((p) => p.lat);
  const hs = points.map((p) => p.height);
  return {
    minLon: Math.min(...lons),
    maxLon: Math.max(...lons),
    minLat: Math.min(...lats),
    maxLat: Math.max(...lats),
    minH: Math.min(...hs),
    maxH: Math.max(...hs),
  };
}
