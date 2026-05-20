// Google Aerial View API — 3D fly-around video lookup.

const AERIAL_VIEW_BASE = 'https://aerialview.googleapis.com/v1/videos';

export async function lookupAerialView(address, apiKey) {
  const url = `${AERIAL_VIEW_BASE}:lookupVideo?address=${encodeURIComponent(address)}&key=${apiKey}`;
  const res = await fetch(url);
  if (!res.ok) {
    const body = await res.text();
    if (res.status === 404) return { covered: false, message: 'Aerial View not available for this address.' };
    throw new Error(`Aerial View API failed: ${res.status} ${body}`);
  }
  const data = await res.json();
  const uris = data.uris || {};
  return {
    covered: true,
    videoId: data.videoId,
    state: data.state,
    videoUrls: {
      standardDef: uris.STANDARD_DEF?.landscapeUri ?? null,
      highDef: uris.HIGH_DEF?.landscapeUri ?? null,
    },
    note: 'Paste a video URL into your browser to watch the 3-D fly-around.',
  };
}
