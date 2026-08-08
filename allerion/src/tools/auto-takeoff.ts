import { z } from "zod";
import { sessionStore } from "../lib/session-store.js";
import { fetchBuildingNear } from "../lib/osm-buildings.js";
import { geocode } from "./geocode.js";
import type { Point3D } from "../lib/geometry.js";

export const autoTakeoffSchema = z.object({
  session_id: z.string().uuid(),
  /** Optional address - if the session doesn't already have a lat/lon, geocode this. */
  address: z.string().optional(),
  /** Default story height in metres when OSM doesn't give us one. Defaults to 3.0. */
  default_story_height_m: z.number().positive().max(10).optional(),
  /** Default story count when OSM doesn't give us one. Defaults to 2. */
  default_stories: z.number().int().positive().max(200).optional(),
  /** Optional roof material hint (used in cost search). */
  roof_material: z.string().optional(),
  /** Optional facade material hint. */
  facade_material: z.string().optional(),
});

export interface AutoTakeoffResult {
  session_id: string;
  source: "osm" | "default";
  osm_id?: number;
  footprint: Array<{ lon: number; lat: number; height: number }>;
  building_height_m: number;
  stories: number;
  building_type?: string;
  materials?: { roof?: string; facade?: string };
  /**
   * Instructions for the calling LLM. Auto-takeoff is meant to be one step
   * in an autonomous loop, so we tell the model what to do next.
   */
  next_steps: string[];
}

/**
 * Autonomous geometry extraction. Given just an address (or an existing
 * session), this pulls the building footprint from OpenStreetMap, infers
 * height from building:levels (or a sensible default), and stages everything
 * the cost estimator needs - so a chat client can go from "estimate the
 * building at 1600 Pennsylvania Ave" to a full dashboard with no clicks.
 *
 * When OSM doesn't have the building, falls back to a square footprint
 * centered on the geocoded coordinate and notes that fallback in the result.
 */
export async function autoTakeoff(
  input: z.infer<typeof autoTakeoffSchema>,
  env: NodeJS.ProcessEnv = process.env,
): Promise<AutoTakeoffResult> {
  const args = autoTakeoffSchema.parse(input);
  const session = sessionStore.get(args.session_id);

  // Ensure we have a lat/lon. Geocode the address if needed.
  if ((session.lat == null || session.lon == null) && args.address) {
    const geo = await geocode({ address: args.address }, env);
    session.lat = geo.lat;
    session.lon = geo.lon;
    session.address = geo.normalized_address;
  }
  if (session.lat == null || session.lon == null) {
    throw new Error(
      "Session has no lat/lon. Pass an `address`, or call fly_to_building first.",
    );
  }

  const defaultHeight = args.default_story_height_m ?? 3.0;
  const defaultStories = args.default_stories ?? 2;

  // Try OSM Buildings.
  const osm = await fetchBuildingNear(session.lat, session.lon);

  let footprint: Point3D[];
  let height: number;
  let stories: number;
  let source: "osm" | "default";
  let osmId: number | undefined;
  let buildingType: string | undefined;
  let materials = { roof: args.roof_material, facade: args.facade_material };

  if (osm && osm.footprint.length >= 3) {
    source = "osm";
    osmId = osm.osm_id;
    buildingType = osm.building_type;
    footprint = osm.footprint.map((p) => ({ lon: p.lon, lat: p.lat, height: 0 }));
    stories = osm.levels ?? defaultStories;
    height = osm.height_m ?? stories * defaultHeight;
    materials = {
      roof: args.roof_material ?? osm.roof_material,
      facade: args.facade_material ?? osm.material,
    };
  } else {
    // Fallback: a 10m x 10m square centered on the geocoded point.
    source = "default";
    const halfDeg = 5 / 111_320;
    const lat0 = session.lat;
    const lon0 = session.lon;
    footprint = [
      { lon: lon0 - halfDeg, lat: lat0 - halfDeg, height: 0 },
      { lon: lon0 + halfDeg, lat: lat0 - halfDeg, height: 0 },
      { lon: lon0 + halfDeg, lat: lat0 + halfDeg, height: 0 },
      { lon: lon0 - halfDeg, lat: lat0 + halfDeg, height: 0 },
    ];
    stories = defaultStories;
    height = stories * defaultHeight;
  }

  session.lastFootprint = footprint;
  session.lastFootprintHeightAvg = 0;
  session.lastBuildingHeight = height;
  session.geometry_source = source;
  session.osm_id = osmId;
  session.materials = {
    ...(session.materials ?? {}),
    ...(materials.roof ? { roof: materials.roof } : {}),
    ...(materials.facade ? { facade: materials.facade } : {}),
  };
  sessionStore.set(args.session_id, session);

  const nextSteps: string[] = [];
  if (source === "default") {
    nextSteps.push(
      "OSM has no building at this address. Geometry is a 10m square fallback - " +
        "ask the user to refine via measure(mode='polygon') or pass a better address.",
    );
  }
  if (!materials.roof || !materials.facade) {
    nextSteps.push(
      "Materials not fully classified. Look at the viewer screenshot and call " +
        "auto_takeoff again with roof_material / facade_material set, " +
        "or proceed to estimate_costs with material-agnostic defaults.",
    );
  }
  nextSteps.push("Call estimate_costs(session_id) to price the takeoff.");
  nextSteps.push("Call open_5d_dashboard(session_id) to render the Bexel-style 5D view.");

  return {
    session_id: args.session_id,
    source,
    osm_id: osmId,
    footprint: footprint.map((p) => ({ lon: p.lon, lat: p.lat, height: p.height })),
    building_height_m: height,
    stories,
    building_type: buildingType,
    materials:
      materials.roof || materials.facade
        ? { roof: materials.roof, facade: materials.facade }
        : undefined,
    next_steps: nextSteps,
  };
}
