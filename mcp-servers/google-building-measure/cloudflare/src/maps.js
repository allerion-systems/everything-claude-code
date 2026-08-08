// Google Maps / Static Maps / Street View — Worker-compatible (fetch only).

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
    location: result.geometry.location,
    placeId: result.place_id,
  };
}

export async function captureSatelliteImage({ lat, lng, zoom = 20, size = '640x640', scale = 2, apiKey }) {
  const url = `${STATIC_MAPS_URL}?center=${lat},${lng}&zoom=${zoom}&size=${size}&scale=${scale}&maptype=satellite&key=${apiKey}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Static Maps failed: ${res.status} ${await res.text()}`);
  const buf = new Uint8Array(await res.arrayBuffer());
  return { mimeType: 'image/png', base64: bytesToBase64(buf), source: 'google-static-maps', url };
}

export async function captureStreetView({ lat, lng, heading = 0, pitch = 10, fov = 80, size = '640x640', apiKey }) {
  const url = `${STREET_VIEW_URL}?location=${lat},${lng}&size=${size}&heading=${heading}&pitch=${pitch}&fov=${fov}&key=${apiKey}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Street View failed: ${res.status} ${await res.text()}`);
  const buf = new Uint8Array(await res.arrayBuffer());
  return { mimeType: 'image/jpeg', base64: bytesToBase64(buf), source: 'google-street-view', heading, url };
}

// Workers don't have Buffer; use btoa with a chunked Uint8 string.
function bytesToBase64(bytes) {
  let binary = '';
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode.apply(null, bytes.subarray(i, i + chunkSize));
  }
  return btoa(binary);
}
