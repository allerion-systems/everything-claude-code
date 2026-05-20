// Google Maps Geocoding + Static Maps client.

const GEOCODE_URL = 'https://maps.googleapis.com/maps/api/geocode/json';
const STATIC_MAPS_URL = 'https://maps.googleapis.com/maps/api/staticmap';
const STREET_VIEW_URL = 'https://maps.googleapis.com/maps/api/streetview';

export async function geocodeAddress(address, apiKey) {
  const url = `${GEOCODE_URL}?address=${encodeURIComponent(address)}&key=${apiKey}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Geocoding failed: ${res.status} ${await res.text()}`);
  const data = await res.json();
  if (data.status !== 'OK' || !data.results?.length) {
    throw new Error(`Geocoding returned no results for "${address}" (status=${data.status})`);
  }
  const result = data.results[0];
  return {
    formattedAddress: result.formatted_address,
    location: result.geometry.location, // { lat, lng }
    placeId: result.place_id,
  };
}

// Returns base64 PNG of a top-down satellite tile centered on (lat,lng).
export async function captureSatelliteImage({ lat, lng, zoom = 20, size = '640x640', scale = 2, apiKey }) {
  const url = `${STATIC_MAPS_URL}?center=${lat},${lng}&zoom=${zoom}&size=${size}&scale=${scale}&maptype=satellite&key=${apiKey}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Static Maps failed: ${res.status} ${await res.text()}`);
  const buf = Buffer.from(await res.arrayBuffer());
  return { mimeType: 'image/png', base64: buf.toString('base64'), source: 'google-static-maps', url };
}

// Returns base64 JPEG Street View shot at a given heading (0=N, 90=E, 180=S, 270=W).
export async function captureStreetView({ lat, lng, heading = 0, pitch = 10, fov = 80, size = '640x640', apiKey }) {
  const url = `${STREET_VIEW_URL}?location=${lat},${lng}&size=${size}&heading=${heading}&pitch=${pitch}&fov=${fov}&key=${apiKey}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Street View failed: ${res.status} ${await res.text()}`);
  const buf = Buffer.from(await res.arrayBuffer());
  return { mimeType: 'image/jpeg', base64: buf.toString('base64'), source: 'google-street-view', heading, url };
}
