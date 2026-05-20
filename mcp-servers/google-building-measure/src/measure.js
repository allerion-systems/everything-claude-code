// Full building measurement orchestrator.

import { geocodeAddress, captureSatelliteImage, captureStreetView } from './maps.js';
import { getBuildingInsights, summarizeInsights } from './solar.js';
import { lookupAerialView } from './aerialView.js';
import { analyzeRoofEdges, countOpenings, identifyComponents } from './vision.js';
import { assembleReport } from './report.js';

export async function measureBuilding({ address, googleApiKey, options = {} }) {
  const {
    headings = [0, 90, 180, 270],
    skipAerialView = false,
    skipStreetView = false,
  } = options;

  const geo = await geocodeAddress(address, googleApiKey);
  const { lat, lng } = geo.location;

  // ── Solar API ─────────────────────────────────────────────────────────────
  let solarSummary = null;
  try {
    const raw = await getBuildingInsights({ lat, lng, apiKey: googleApiKey });
    solarSummary = summarizeInsights(raw);
  } catch (err) {
    solarSummary = { error: err.message };
  }

  // ── Satellite image → roof edge + component analysis ─────────────────────
  let edgeAnalysis = null;
  let componentAnalysis = null;
  try {
    const img = await captureSatelliteImage({ lat, lng, zoom: 20, apiKey: googleApiKey });
    [edgeAnalysis, componentAnalysis] = await Promise.all([
      analyzeRoofEdges({ base64: img.base64, mimeType: img.mimeType }),
      identifyComponents({ base64: img.base64, mimeType: img.mimeType }),
    ]);
  } catch (err) {
    edgeAnalysis = { ok: false, error: err.message };
    componentAnalysis = { ok: false, error: err.message };
  }

  // ── Aerial View ───────────────────────────────────────────────────────────
  let aerialView = null;
  if (!skipAerialView) {
    try {
      aerialView = await lookupAerialView(geo.formattedAddress, googleApiKey);
    } catch (err) {
      aerialView = { covered: false, error: err.message };
    }
  }

  // ── Street View sweep → opening counts ───────────────────────────────────
  const perSide = [];
  if (!skipStreetView) {
    for (const heading of headings) {
      try {
        const img = await captureStreetView({ lat, lng, heading, apiKey: googleApiKey });
        const openings = await countOpenings({ base64: img.base64, mimeType: img.mimeType });
        perSide.push({ heading, openings });
      } catch (err) {
        perSide.push({ heading, error: err.message });
      }
    }
  }

  // ── Assemble Roofr-style report ───────────────────────────────────────────
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

// Re-export helpers for thin tool wrappers.
export {
  geocodeAddress,
  captureSatelliteImage,
  captureStreetView,
  getBuildingInsights,
  summarizeInsights,
  analyzeRoofEdges,
  countOpenings,
  identifyComponents,
  lookupAerialView,
};
