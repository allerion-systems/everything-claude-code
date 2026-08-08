// Orchestrates the full Roofr-style measurement using Worker-compatible fetch.

import { geocodeAddress, captureSatelliteImage, captureStreetView } from './maps.js';
import { getBuildingInsights, summarizeInsights } from './solar.js';
import { lookupAerialView } from './aerialView.js';
import { analyzeRoofEdges, countOpenings, identifyComponents } from './vision.js';
import { assembleReport } from './report.js';

export async function measureBuilding({ address, env, options = {} }) {
  const { skipStreetView = false, skipAerialView = false } = options;
  const googleKey = env.GOOGLE_MAPS_API_KEY;
  const geminiKey = env.GEMINI_API_KEY;

  if (!googleKey) throw new Error('GOOGLE_MAPS_API_KEY env var is not set on this Worker.');
  if (!geminiKey) throw new Error('GEMINI_API_KEY env var is not set on this Worker.');

  // Geocode
  const geo = await geocodeAddress(address, googleKey);
  const { lat, lng } = geo.location;

  // Solar API
  let solarSummary = null;
  try {
    const raw = await getBuildingInsights({ lat, lng, apiKey: googleKey });
    solarSummary = summarizeInsights(raw);
  } catch (err) {
    solarSummary = { error: err.message };
  }

  // Satellite + vision
  let edgeAnalysis = null;
  let componentAnalysis = null;
  try {
    const img = await captureSatelliteImage({ lat, lng, zoom: 20, apiKey: googleKey });
    [edgeAnalysis, componentAnalysis] = await Promise.all([
      analyzeRoofEdges({ base64: img.base64, mimeType: img.mimeType, geminiKey }),
      identifyComponents({ base64: img.base64, mimeType: img.mimeType, geminiKey }),
    ]);
  } catch (err) {
    edgeAnalysis = { ok: false, error: err.message };
    componentAnalysis = { ok: false, error: err.message };
  }

  // Aerial View
  let aerialView = null;
  if (!skipAerialView) {
    try {
      aerialView = await lookupAerialView(geo.formattedAddress, googleKey);
    } catch (err) {
      aerialView = { covered: false, error: err.message };
    }
  }

  // Street View sweep
  const perSide = [];
  if (!skipStreetView) {
    for (const heading of [0, 90, 180, 270]) {
      try {
        const img = await captureStreetView({ lat, lng, heading, apiKey: googleKey });
        const openings = await countOpenings({ base64: img.base64, mimeType: img.mimeType, geminiKey });
        perSide.push({ heading, openings });
      } catch (err) {
        perSide.push({ heading, error: err.message });
      }
    }
  }

  return assembleReport({
    address,
    geo,
    solarSummary,
    edgeAnalysis,
    componentAnalysis,
    aerialView,
    openings: { perSide },
  });
}
