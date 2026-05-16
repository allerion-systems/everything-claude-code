// Turns a session's measured / auto-extracted geometry into a list of
// priced element rows. This is the "quantity takeoff" step - everything
// downstream (cost estimate, dashboard, IFC enrichment) reads from this.

import { polygonAreaM2, polylineLength, type LngLat } from "./geometry.js";
import type { Session } from "./session-store.js";

export interface TakeoffRow {
  /** Stable id within the session, useful for dashboard hover. */
  id: string;
  /** UniFormat 2010 element code. */
  uniformat_code: string;
  /** Human-readable classification (matches Bexel taxonomy labels). */
  classification: string;
  /** Friendly description. */
  description: string;
  /** Unit: m2, m3, m, ea. */
  unit: string;
  /** Quantity in that unit. */
  quantity: number;
  /** Keyword query to send to the live cost API. */
  search_query: string;
  /** Optional material override the agent has classified. */
  material?: string;
}

export interface TakeoffResult {
  rows: TakeoffRow[];
  /** Floor-plan area of the building (m2). */
  gross_floor_area_m2: number;
  /** Perimeter of the footprint (m). */
  perimeter_m: number;
}

/**
 * Build the takeoff from session state. Throws clearly if the geometry the
 * caller depends on is missing - we never make up quantities silently.
 */
export function takeoffFromSession(session: Session): TakeoffResult {
  const footprint = session.lastFootprint;
  const height = session.lastBuildingHeight;
  if (!footprint || footprint.length < 3) {
    throw new Error(
      "No footprint in session. Run auto_takeoff or measure(mode='polygon') first.",
    );
  }
  if (!height || height <= 0) {
    throw new Error(
      "No building height. Run auto_takeoff (uses OSM levels) or measure(mode='vertical') first.",
    );
  }

  const footprintLngLat: LngLat[] = footprint.map((p) => ({ lon: p.lon, lat: p.lat }));
  const area = polygonAreaM2(footprintLngLat);
  const perimeter = polylineLength([
    ...footprint,
    footprint[0]!,
  ]);
  const stories = Math.max(1, Math.round(height / 3));
  const grossFloor = area * stories;

  const roofMaterial = session.materials?.roof;
  const facadeMaterial = session.materials?.facade;

  const rows: TakeoffRow[] = [
    {
      id: "foundation",
      uniformat_code: "A1010",
      classification: "A-Substructure",
      description: "Foundation strip and slab on grade",
      unit: "m3",
      // Strip footing approx: perimeter * 0.6m wide * 0.3m deep + slab area * 0.15m
      quantity: round2(perimeter * 0.6 * 0.3 + area * 0.15),
      search_query: "concrete foundation slab",
    },
    {
      id: "exterior-walls",
      uniformat_code: "B2010",
      classification: "B-Shell",
      description: `Exterior walls${facadeMaterial ? ` (${facadeMaterial})` : ""}`,
      unit: "m2",
      quantity: round2(perimeter * height),
      search_query: facadeMaterial
        ? `exterior wall ${facadeMaterial}`
        : "exterior wall masonry",
      material: facadeMaterial,
    },
    {
      id: "floors",
      uniformat_code: "B1010",
      classification: "B-Shell",
      description: `Floor construction (${stories} ${stories === 1 ? "story" : "stories"})`,
      unit: "m2",
      quantity: round2(area * Math.max(0, stories - 1)),
      search_query: "concrete floor slab",
    },
    {
      id: "roof",
      uniformat_code: "B3010",
      classification: "B-Shell",
      description: `Roof construction${roofMaterial ? ` (${roofMaterial})` : ""}`,
      unit: "m2",
      quantity: round2(area),
      search_query: roofMaterial ? `roof ${roofMaterial}` : "roof construction",
      material: roofMaterial,
    },
    {
      id: "interior-partitions",
      uniformat_code: "C1010",
      classification: "C-Interiors",
      // Rule of thumb: interior partitions ~= 1.2x exterior wall area for typical commercial.
      description: "Interior partitions (estimated)",
      unit: "m2",
      quantity: round2(perimeter * height * 1.2),
      search_query: "interior partition drywall",
    },
  ];

  // Drop zero-quantity rows (e.g. single-story buildings have 0 floor construction).
  return {
    rows: rows.filter((r) => r.quantity > 0),
    gross_floor_area_m2: round2(grossFloor),
    perimeter_m: round2(perimeter),
  };
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
