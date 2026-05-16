// Cost library. Wraps the buildcalculator.io open-source construction cost
// API (CC-BY-4.0 data, Apache-2.0 code, 55K+ items, 30 regions, no auth).
//
// Strategy:
//  1. For each element we want to price, hit the API with a keyword query.
//  2. Score matches and pick the best, converting EUR -> USD via a fixed rate
//     (good enough for estimates; user can override).
//  3. If the API is down or returns no good match, fall back to a tiny
//     hand-curated default rate table so the dashboard always renders.
//
// Cache responses in-memory for 10 minutes - cost data doesn't change fast and
// we don't want to thrash the API on every tool call.

const API_BASE = "https://buildcalculator.io/api/v1/search";
const EUR_TO_USD = 1.08; // static; override via env if needed
const CACHE_TTL_MS = 10 * 60 * 1000;

export type Currency = "USD" | "EUR";

export interface CostBreakdown {
  material: number;
  labor: number;
  equipment: number;
  total: number;
  currency: Currency;
}

export interface CostRate extends CostBreakdown {
  unit: string;
  source: "live" | "default";
  rate_code?: string;
  citation?: string;
}

interface ApiItem {
  rate_code: string;
  original_name?: string;
  name?: string;
  unit: string;
  currency: string;
  pricing: {
    total_per_unit: number;
    labor_per_unit: number;
    material_per_unit: number;
    equipment_per_unit: number;
  };
}

const cache = new Map<string, { at: number; rate: CostRate }>();

/**
 * Tiny hand-curated default rate book. Rough US 2026 figures - placeholders
 * for users to override with regional data or their own RSMeans-style book.
 * Splits are best-effort industry averages, not procurement-grade.
 */
const DEFAULTS: Record<string, Omit<CostRate, "source">> = {
  // UniFormat-aligned codes
  "A1010": { material: 120, labor: 240, equipment: 40, total: 400, currency: "USD", unit: "m3" },
  "A2010": { material: 160, labor: 200, equipment: 40, total: 400, currency: "USD", unit: "m2" },
  "B1010": { material: 90,  labor: 72,  equipment: 18, total: 180, currency: "USD", unit: "m2" },
  "B2010": { material: 120, labor: 110, equipment: 20, total: 250, currency: "USD", unit: "m2" },
  "B3010": { material: 110, labor: 70,  equipment: 20, total: 200, currency: "USD", unit: "m2" },
  "C1010": { material: 35,  labor: 50,  equipment: 5,  total: 90,  currency: "USD", unit: "m2" },
};

/** Map an element classification to a default rate. */
export function defaultRate(uniformatCode: string): CostRate {
  const base = DEFAULTS[uniformatCode];
  if (!base) {
    throw new Error(`No default rate for UniFormat code ${uniformatCode}`);
  }
  return { ...base, source: "default", citation: "Allerion default rate book v0" };
}

/**
 * Best-effort live rate from buildcalculator.io. Returns null if nothing
 * scores high enough to trust - caller falls back to default.
 */
export async function fetchLiveRate(
  query: string,
  unit: string,
  signal?: AbortSignal,
): Promise<CostRate | null> {
  const cacheKey = `${query}::${unit}`;
  const hit = cache.get(cacheKey);
  if (hit && Date.now() - hit.at < CACHE_TTL_MS) return hit.rate;

  const url = `${API_BASE}?q=${encodeURIComponent(query)}&limit=10`;
  let data: { results?: ApiItem[] };
  try {
    const res = await fetch(url, { signal });
    if (!res.ok) return null;
    data = (await res.json()) as { results?: ApiItem[] };
  } catch {
    return null;
  }
  const items = data.results ?? [];
  if (items.length === 0) return null;

  // Score: REQUIRE matching unit (otherwise the API's keyword search returns
  // unrelated items, e.g. "ton of road signs" for "concrete foundation").
  // Then prefer non-zero material cost (filters Soviet-era labor-only books)
  // and a reasonable total per unit.
  const candidates = items.filter(
    (it) => it.pricing && it.pricing.total_per_unit > 0 && it.unit === unit,
  );
  if (candidates.length === 0) return null;

  const scored = candidates
    .map((it) => {
      let score = 0;
      if (it.pricing.material_per_unit > 0) score += 5;
      if (it.pricing.total_per_unit < 5000) score += 2;
      if (it.pricing.material_per_unit > 0 && it.pricing.labor_per_unit > 0) score += 3;
      return { it, score };
    })
    .sort((a, b) => b.score - a.score);

  const best = scored[0]!.it;

  const eurToUsd = best.currency === "EUR" ? EUR_TO_USD : 1;
  const rate: CostRate = {
    material: round2(best.pricing.material_per_unit * eurToUsd),
    labor: round2(best.pricing.labor_per_unit * eurToUsd),
    equipment: round2(best.pricing.equipment_per_unit * eurToUsd),
    total: round2(best.pricing.total_per_unit * eurToUsd),
    currency: "USD",
    unit: best.unit,
    source: "live",
    rate_code: best.rate_code,
    citation: `buildcalculator.io ${best.rate_code} (${best.original_name ?? best.name ?? "n/a"})`,
  };
  cache.set(cacheKey, { at: Date.now(), rate });
  return rate;
}

export async function getRate(
  uniformatCode: string,
  searchQuery: string,
  unit: string,
): Promise<CostRate> {
  const live = await fetchLiveRate(searchQuery, unit);
  if (live) return live;
  return defaultRate(uniformatCode);
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
