// OpenStreetMap Buildings lookup via the Overpass API. Given a lat/lon,
// finds the nearest building feature and returns its footprint + any
// height/level/material tags OSM contributors have provided.
//
// This is what makes the auto-takeoff agent "just work" without the user
// having to click anything - we pull the building geometry straight from
// OSM, then enrich with vision/measurement only when needed.

const OVERPASS = "https://overpass-api.de/api/interpreter";

export interface OsmBuilding {
  osm_id: number;
  footprint: Array<{ lon: number; lat: number }>;
  /** Explicit height tag in metres if present. */
  height_m?: number;
  /** Number of above-ground stories if present. */
  levels?: number;
  /** building=yes | residential | commercial | industrial | etc. */
  building_type?: string;
  /** building:material tag if present (e.g. "concrete", "brick"). */
  material?: string;
  /** roof:material tag if present. */
  roof_material?: string;
  /** roof:shape tag if present (flat | gabled | hipped | etc). */
  roof_shape?: string;
}

/**
 * Find the OSM building at or nearest to a given coordinate.
 * Radius in metres - default 30m catches the building you're standing on
 * without grabbing the neighbour.
 */
export async function fetchBuildingNear(
  lat: number,
  lon: number,
  radius = 30,
  signal?: AbortSignal,
): Promise<OsmBuilding | null> {
  const query = `
    [out:json][timeout:15];
    (
      way(around:${radius},${lat},${lon})["building"];
      relation(around:${radius},${lat},${lon})["building"];
    );
    out body geom;
  `;
  let data: { elements?: Array<OverpassElement> };
  try {
    const res = await fetch(OVERPASS, {
      method: "POST",
      body: `data=${encodeURIComponent(query)}`,
      headers: { "content-type": "application/x-www-form-urlencoded" },
      signal,
    });
    if (!res.ok) return null;
    data = (await res.json()) as { elements?: Array<OverpassElement> };
  } catch {
    return null;
  }

  const ways = (data.elements ?? []).filter((e) => e.type === "way" && e.geometry);
  if (ways.length === 0) return null;

  // Pick the way whose centroid is closest to the requested point.
  ways.sort((a, b) => distSq(centroid(a), { lat, lon }) - distSq(centroid(b), { lat, lon }));
  const w = ways[0]!;
  const tags = w.tags ?? {};
  return {
    osm_id: w.id,
    footprint: (w.geometry ?? []).map((g) => ({ lon: g.lon, lat: g.lat })),
    height_m: tags["height"] ? parseFloat(tags["height"]) : undefined,
    levels: tags["building:levels"] ? parseInt(tags["building:levels"], 10) : undefined,
    building_type: tags["building"],
    material: tags["building:material"],
    roof_material: tags["roof:material"],
    roof_shape: tags["roof:shape"],
  };
}

interface OverpassElement {
  type: string;
  id: number;
  tags?: Record<string, string>;
  geometry?: Array<{ lat: number; lon: number }>;
}

function centroid(w: OverpassElement): { lat: number; lon: number } {
  const g = w.geometry ?? [];
  if (g.length === 0) return { lat: 0, lon: 0 };
  const lat = g.reduce((s, p) => s + p.lat, 0) / g.length;
  const lon = g.reduce((s, p) => s + p.lon, 0) / g.length;
  return { lat, lon };
}

function distSq(a: { lat: number; lon: number }, b: { lat: number; lon: number }): number {
  const dx = a.lon - b.lon;
  const dy = a.lat - b.lat;
  return dx * dx + dy * dy;
}
