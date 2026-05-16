import { z } from "zod";

export const geocodeSchema = z.object({
  address: z.string().min(3, "address must be a real string"),
});

export interface GeocodeResult {
  lat: number;
  lon: number;
  normalized_address: string;
  country?: string;
  source: "mapbox" | "nominatim";
}

/**
 * Geocode an address to lat/lon. Tries Mapbox first if MAPBOX_TOKEN is set,
 * falls back to OpenStreetMap Nominatim (which is free but rate-limited and
 * forbids heavy automated use - fine for individual chat-driven lookups).
 */
export async function geocode(
  input: z.infer<typeof geocodeSchema>,
  env: NodeJS.ProcessEnv = process.env,
): Promise<GeocodeResult> {
  const { address } = geocodeSchema.parse(input);

  if (env.MAPBOX_TOKEN) {
    const url =
      `https://api.mapbox.com/geocoding/v5/mapbox.places/` +
      `${encodeURIComponent(address)}.json?limit=1&access_token=${env.MAPBOX_TOKEN}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Mapbox geocode failed: ${res.status}`);
    const data = (await res.json()) as {
      features: Array<{
        center: [number, number];
        place_name: string;
        context?: Array<{ id: string; text: string }>;
      }>;
    };
    const feat = data.features[0];
    if (!feat) throw new Error(`No geocode result for "${address}"`);
    const country = feat.context?.find((c) => c.id.startsWith("country"))?.text;
    return {
      lon: feat.center[0],
      lat: feat.center[1],
      normalized_address: feat.place_name,
      country,
      source: "mapbox",
    };
  }

  // Nominatim fallback. Respect their UA policy.
  const url =
    `https://nominatim.openstreetmap.org/search?` +
    `format=json&limit=1&q=${encodeURIComponent(address)}`;
  const res = await fetch(url, {
    headers: { "User-Agent": "Allerion/0.0.1 (contact: dev@allerion.local)" },
  });
  if (!res.ok) throw new Error(`Nominatim geocode failed: ${res.status}`);
  const data = (await res.json()) as Array<{
    lat: string;
    lon: string;
    display_name: string;
  }>;
  const hit = data[0];
  if (!hit) throw new Error(`No geocode result for "${address}"`);
  return {
    lat: parseFloat(hit.lat),
    lon: parseFloat(hit.lon),
    normalized_address: hit.display_name,
    source: "nominatim",
  };
}
