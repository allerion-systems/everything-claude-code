import { z } from "zod";
import { sessionStore } from "../lib/session-store.js";
import { estimateCosts } from "./estimate-costs.js";

export const open5dDashboardSchema = z.object({
  session_id: z.string().uuid(),
});

export interface Open5dDashboardResult {
  session_id: string;
  dashboard_url: string;
  app_html: string;
}

/**
 * Returns an MCP App response that renders the Bexel-style 5D Estimation
 * dashboard for the session: top-down Cesium viewer with the building
 * extrusion, totals cards (Material / Labor / Equipment / Total), per-
 * element cost table, and a cost-by-classification doughnut.
 *
 * Idempotent: runs estimate_costs first if we don't have a cached estimate.
 */
export async function open5dDashboard(
  input: z.infer<typeof open5dDashboardSchema>,
  env: NodeJS.ProcessEnv = process.env,
): Promise<Open5dDashboardResult> {
  const args = open5dDashboardSchema.parse(input);
  const session = sessionStore.get(args.session_id);

  // Make sure an estimate exists - failing here gives a clearer error than
  // the dashboard JS failing to render an empty page.
  if (!session.lastEstimate) {
    await estimateCosts({ session_id: args.session_id });
  }

  const base = env.PUBLIC_VIEWER_URL ?? "http://localhost:8787";
  const url = new URL(`${base}/dashboard-5d.html`);
  url.searchParams.set("session", args.session_id);

  const appHtml = `<!doctype html>
<html><head><meta charset="utf-8"><title>Allerion 5D Estimation - ${escapeHtml(session.address ?? "Untitled")}</title>
<style>html,body,iframe{margin:0;padding:0;height:100%;width:100%;border:0;background:#0a0a0d}</style>
</head><body><iframe src="${url.toString()}" allow="fullscreen" loading="eager"></iframe></body></html>`;

  return {
    session_id: args.session_id,
    dashboard_url: url.toString(),
    app_html: appHtml,
  };
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!,
  );
}
