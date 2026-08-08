import { z } from "zod";
import { sessionStore, type SessionEstimate } from "../lib/session-store.js";
import { takeoffFromSession } from "../lib/quantity-takeoff.js";
import { getRate } from "../lib/cost-library.js";

export const estimateCostsSchema = z.object({
  session_id: z.string().uuid(),
  /** Force re-fetching live rates even if a cached estimate exists. */
  refresh: z.boolean().optional(),
  /**
   * Per-UniFormat-code rate overrides. Use to plug in your own cost book.
   * Shape: { "B2010": { total: 280, material: 130, labor: 130, equipment: 20 } }
   */
  rate_overrides: z
    .record(
      z.object({
        total: z.number().positive(),
        material: z.number().nonnegative(),
        labor: z.number().nonnegative(),
        equipment: z.number().nonnegative(),
      }),
    )
    .optional(),
});

export interface EstimateCostsResult extends SessionEstimate {
  session_id: string;
  gross_floor_area_m2: number;
  perimeter_m: number;
}

/**
 * Compute the full 5D cost estimate for a session. Pulls live rates from
 * the open buildcalculator.io API, falls back to defaults when the API
 * misses, and stores the result on the session for the dashboard to read.
 */
export async function estimateCosts(
  input: z.infer<typeof estimateCostsSchema>,
): Promise<EstimateCostsResult> {
  const args = estimateCostsSchema.parse(input);
  const session = sessionStore.get(args.session_id);

  if (!args.refresh && session.lastEstimate && Date.now() - session.lastEstimate.computed_at < 5 * 60 * 1000) {
    return {
      ...session.lastEstimate,
      session_id: args.session_id,
      gross_floor_area_m2: takeoffFromSession(session).gross_floor_area_m2,
      perimeter_m: takeoffFromSession(session).perimeter_m,
    };
  }

  const takeoff = takeoffFromSession(session);

  const rows = await Promise.all(
    takeoff.rows.map(async (row) => {
      const override = args.rate_overrides?.[row.uniformat_code];
      const rate = override
        ? {
            total: override.total,
            material: override.material,
            labor: override.labor,
            equipment: override.equipment,
            currency: "USD" as const,
            unit: row.unit,
            source: "default" as const,
            citation: "User override",
          }
        : await getRate(row.uniformat_code, row.search_query, row.unit);

      return {
        id: row.id,
        uniformat_code: row.uniformat_code,
        classification: row.classification,
        description: row.description,
        unit: row.unit,
        quantity: row.quantity,
        rate_total: rate.total,
        rate_material: rate.material,
        rate_labor: rate.labor,
        rate_equipment: rate.equipment,
        cost_total: round2(row.quantity * rate.total),
        cost_material: round2(row.quantity * rate.material),
        cost_labor: round2(row.quantity * rate.labor),
        cost_equipment: round2(row.quantity * rate.equipment),
        source: rate.source,
        citation: rate.citation,
      };
    }),
  );

  const totals = rows.reduce(
    (acc, r) => ({
      total: acc.total + r.cost_total,
      material: acc.material + r.cost_material,
      labor: acc.labor + r.cost_labor,
      equipment: acc.equipment + r.cost_equipment,
    }),
    { total: 0, material: 0, labor: 0, equipment: 0 },
  );

  const estimate: SessionEstimate = {
    total: round2(totals.total),
    material: round2(totals.material),
    labor: round2(totals.labor),
    equipment: round2(totals.equipment),
    currency: "USD",
    rows,
    computed_at: Date.now(),
  };

  session.lastEstimate = estimate;
  sessionStore.set(args.session_id, session);

  return {
    ...estimate,
    session_id: args.session_id,
    gross_floor_area_m2: takeoff.gross_floor_area_m2,
    perimeter_m: takeoff.perimeter_m,
  };
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
