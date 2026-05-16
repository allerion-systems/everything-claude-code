import { z } from "zod";
import { geocode } from "./geocode.js";
import { resolveProvider, type Provider } from "../lib/providers.js";

export const flyToBuildingSchema = z.object({
  address: z.string().min(3),
  provider: z.enum(["google-3d-tiles", "osm-buildings"]).optional(),
  /** Camera height above ground in metres. Defaults to 200m for buildings. */
  altitude_m: z.number().positive().max(20_000).optional(),
});

export interface FlyToBuildingResult {
  session_id: string;
  lat: number;
  lon: number;
  normalized_address: string;
  provider: Provider;
  viewer_url: string;
  /**
   * Self-contained HTML the MCP App spec returns to the chat client. The
   * viewer pulls Cesium from CDN and bootstraps with the camera target.
   */
  app_html: string;
}

/**
 * Geocode the address and return an MCP App response that the chat surface
 * (Claude / ChatGPT / VS Code) will render as an embedded interactive viewer.
 *
 * The session_id is what subsequent measure / export_ifc calls reference -
 * the viewer posts measurements back to the server keyed on this id.
 */
export async function flyToBuilding(
  input: z.infer<typeof flyToBuildingSchema>,
  env: NodeJS.ProcessEnv = process.env,
): Promise<FlyToBuildingResult> {
  const args = flyToBuildingSchema.parse(input);
  const geo = await geocode({ address: args.address }, env);
  const provider = resolveProvider(args.provider, env);
  const altitude = args.altitude_m ?? 200;
  const sessionId = crypto.randomUUID();

  const base = env.PUBLIC_VIEWER_URL ?? "http://localhost:8787";
  const url = new URL(`${base}/viewer.html`);
  url.searchParams.set("session", sessionId);
  url.searchParams.set("lat", geo.lat.toString());
  url.searchParams.set("lon", geo.lon.toString());
  url.searchParams.set("altitude", altitude.toString());
  url.searchParams.set("provider", provider);
  url.searchParams.set("address", geo.normalized_address);

  // MCP Apps spec: return an iframe-embeddable URL plus a minimal HTML
  // wrapper. Clients that don't yet support inline rendering see the link.
  const appHtml = `<!doctype html>
<html><head><meta charset="utf-8"><title>Allerion Measure - ${escapeHtml(geo.normalized_address)}</title>
<style>html,body,iframe{margin:0;padding:0;height:100%;width:100%;border:0;background:#000}</style>
</head><body><iframe src="${url.toString()}" allow="fullscreen" loading="eager"></iframe></body></html>`;

  return {
    session_id: sessionId,
    lat: geo.lat,
    lon: geo.lon,
    normalized_address: geo.normalized_address,
    provider,
    viewer_url: url.toString(),
    app_html: appHtml,
  };
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!,
  );
}
