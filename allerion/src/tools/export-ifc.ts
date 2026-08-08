import { z } from "zod";
import { buildIfc } from "../lib/ifc-builder.js";
import { sessionStore } from "../lib/session-store.js";

export const exportIfcSchema = z.object({
  session_id: z.string().uuid(),
  /** Override building name. Defaults to the geocoded address. */
  name: z.string().optional(),
  /** Override building height in metres. Defaults to last vertical measurement. */
  height_m: z.number().positive().max(2_000).optional(),
});

export interface ExportIfcResult {
  filename: string;
  ifc_bytes: number;
  /** The full IFC2X3 STEP file text. Big-ish but chat-friendly for v0. */
  ifc: string;
}

/**
 * Build an IFC from the session's last polygon footprint and vertical
 * measurement. Caller can override either. Throws a clear error if the
 * session has neither - we don't want to silently emit garbage geometry.
 */
export function exportIfc(input: z.infer<typeof exportIfcSchema>): ExportIfcResult {
  const args = exportIfcSchema.parse(input);
  const session = sessionStore.get(args.session_id);

  const footprint = session.lastFootprint;
  if (!footprint || footprint.length < 3) {
    throw new Error(
      "No footprint in session. Use measure(mode='polygon', points=[...]) " +
        "with at least 3 building corners before exporting IFC.",
    );
  }
  const height =
    args.height_m ??
    session.lastBuildingHeight ??
    (() => {
      throw new Error(
        "No building height. Use measure(mode='vertical', points=[ground, eave]) " +
          "or pass height_m explicitly.",
      );
    })();

  const name = args.name ?? session.address ?? `Building-${session.id.slice(0, 8)}`;

  const { ifc, filename } = buildIfc({
    footprint: footprint.map((p) => ({ lon: p.lon, lat: p.lat })),
    heightM: height,
    name,
    address: session.address,
  });

  return {
    filename,
    ifc_bytes: Buffer.byteLength(ifc, "utf8"),
    ifc,
  };
}
