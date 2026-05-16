import { z } from "zod";
import {
  distance3D,
  polylineLength,
  polygonAreaM2,
  trianglePitchDeg,
  bbox,
  type Point3D,
} from "../lib/geometry.js";
import { sessionStore } from "../lib/session-store.js";

const point3DSchema = z.object({
  lon: z.number(),
  lat: z.number(),
  height: z.number(),
});

export const measureSchema = z.object({
  session_id: z.string().uuid(),
  /** "polyline" sums segments, "polygon" computes ground area, "vertical" computes height delta, "pitch" estimates roof slope. */
  mode: z.enum(["polyline", "polygon", "vertical", "pitch"]),
  points: z.array(point3DSchema).min(2),
  label: z.string().optional(),
});

export interface MeasureResult {
  session_id: string;
  mode: "polyline" | "polygon" | "vertical" | "pitch";
  /** Always populated for polyline/vertical. */
  distance_m?: number;
  /** Populated for polygon. */
  area_m2?: number;
  /** Populated for vertical. */
  vertical_m?: number;
  /** Populated for pitch. */
  slope_deg?: number;
  bbox: ReturnType<typeof bbox>;
  saved_as: string;
}

/**
 * Run a measurement on a set of 3D points produced by the viewer.
 * Result is stored against the session so export_ifc can pick it up.
 */
export function measure(
  input: z.infer<typeof measureSchema>,
): MeasureResult {
  const args = measureSchema.parse(input);
  const points = args.points as Point3D[];
  const session = sessionStore.get(args.session_id);

  const result: MeasureResult = {
    session_id: args.session_id,
    mode: args.mode,
    bbox: bbox(points),
    saved_as: args.label ?? args.mode,
  };

  switch (args.mode) {
    case "polyline":
      result.distance_m = polylineLength(points);
      break;
    case "polygon":
      if (points.length < 3) {
        throw new Error("polygon measurement needs at least 3 points");
      }
      result.area_m2 = polygonAreaM2(points);
      // Also note the average height so export_ifc can guess building height.
      session.lastFootprint = points;
      session.lastFootprintHeightAvg =
        points.reduce((s, p) => s + p.height, 0) / points.length;
      break;
    case "vertical":
      if (points.length !== 2) {
        throw new Error("vertical measurement needs exactly 2 points");
      }
      result.vertical_m = Math.abs(points[1]!.height - points[0]!.height);
      result.distance_m = distance3D(points[0]!, points[1]!);
      session.lastBuildingHeight = result.vertical_m;
      break;
    case "pitch":
      if (points.length !== 3) {
        throw new Error("pitch measurement needs exactly 3 roof points");
      }
      result.slope_deg = trianglePitchDeg(points[0]!, points[1]!, points[2]!);
      break;
  }

  session.measurements.push({ ...result, points });
  sessionStore.set(args.session_id, session);
  return result;
}
