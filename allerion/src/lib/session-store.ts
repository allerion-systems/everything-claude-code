// Tiny in-memory session store. Persists for the life of the MCP server
// process. Production deployment will swap this for Redis or SQLite so
// long-running chats survive restarts and so multiple workers share state.

import type { Point3D } from "./geometry.js";

export interface SessionMeasurement {
  mode: "polyline" | "polygon" | "vertical" | "pitch";
  points: Point3D[];
  distance_m?: number;
  area_m2?: number;
  vertical_m?: number;
  slope_deg?: number;
}

export interface SessionMaterials {
  roof?: string;
  facade?: string;
  foundation?: string;
}

export interface SessionEstimate {
  total: number;
  material: number;
  labor: number;
  equipment: number;
  currency: "USD";
  rows: Array<{
    id: string;
    uniformat_code: string;
    classification: string;
    description: string;
    unit: string;
    quantity: number;
    rate_total: number;
    rate_material: number;
    rate_labor: number;
    rate_equipment: number;
    cost_total: number;
    cost_material: number;
    cost_labor: number;
    cost_equipment: number;
    source: "live" | "default";
    citation?: string;
  }>;
  computed_at: number;
}

export interface Session {
  id: string;
  address?: string;
  lat?: number;
  lon?: number;
  measurements: SessionMeasurement[];
  lastFootprint?: Point3D[];
  lastFootprintHeightAvg?: number;
  lastBuildingHeight?: number;
  /** Source of the geometry: 'measured' (user clicks), 'osm' (auto), or 'default' (fallback square). */
  geometry_source?: "measured" | "osm" | "default";
  /** OSM building tags if auto-takeoff was used. */
  osm_id?: number;
  materials?: SessionMaterials;
  lastEstimate?: SessionEstimate;
  createdAt: number;
}

class SessionStore {
  private sessions = new Map<string, Session>();

  get(id: string): Session {
    let s = this.sessions.get(id);
    if (!s) {
      s = { id, measurements: [], createdAt: Date.now() };
      this.sessions.set(id, s);
    }
    return s;
  }

  set(id: string, session: Session): void {
    this.sessions.set(id, session);
  }

  delete(id: string): boolean {
    return this.sessions.delete(id);
  }

  /** Drop sessions older than 24h on every call - cheap and bounded. */
  gc(): void {
    const cutoff = Date.now() - 24 * 60 * 60 * 1000;
    for (const [id, s] of this.sessions) {
      if (s.createdAt < cutoff) this.sessions.delete(id);
    }
  }
}

export const sessionStore = new SessionStore();
