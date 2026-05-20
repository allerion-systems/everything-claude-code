// One-shot measurement: address in → full building takeoff out.

import { geocodeAddress, captureSatelliteImage, captureStreetView } from './maps.js';
import { getBuildingInsights, summarizeInsights } from './solar.js';
import { countOpenings, identifyComponents } from './vision.js';

const M_TO_FT = 3.28084;

export async function measureBuilding({ address, googleApiKey, options = {} }) {
  const { headings = [0, 90, 180, 270], assumedStoryHeightFt = 10 } = options;

  const geo = await geocodeAddress(address, googleApiKey);
  const { lat, lng } = geo.location;

  // Solar API — roof / gutters / footprint.
  let solar;
  try {
    const raw = await getBuildingInsights({ lat, lng, apiKey: googleApiKey });
    solar = summarizeInsights(raw);
  } catch (err) {
    solar = { error: err.message };
  }

  // Satellite image + roof shape inspection.
  let satellite, satelliteAnalysis;
  try {
    satellite = await captureSatelliteImage({ lat, lng, apiKey: googleApiKey });
    satelliteAnalysis = await identifyComponents({ base64: satellite.base64, mimeType: satellite.mimeType });
  } catch (err) {
    satelliteAnalysis = { ok: false, error: err.message };
  }

  // Street View sweep — one image per heading, count openings.
  const sides = [];
  for (const heading of headings) {
    try {
      const img = await captureStreetView({ lat, lng, heading, apiKey: googleApiKey });
      const openings = await countOpenings({ base64: img.base64, mimeType: img.mimeType });
      sides.push({ heading, sourceUrl: img.url, openings });
    } catch (err) {
      sides.push({ heading, error: err.message });
    }
  }

  // Aggregate opening counts across the four facades.
  const totals = { windows: 0, doors: 0, garage_doors: 0, other_openings: 0 };
  for (const side of sides) {
    if (side.openings?.ok && side.openings.data) {
      for (const k of Object.keys(totals)) totals[k] += Number(side.openings.data[k] || 0);
    }
  }

  // Wall square footage estimate: footprint perimeter * assumed story height * stories.
  const stories = satelliteAnalysis?.ok ? Number(satelliteAnalysis.data?.walls?.stories_guess || 1) : 1;
  const perimeterFt = solar?.footprint?.approxPerimeterFeet ?? null;
  const wallSqFt = perimeterFt ? Math.round(perimeterFt * assumedStoryHeightFt * stories) : null;

  return {
    address: { input: address, resolved: geo.formattedAddress, lat, lng, placeId: geo.placeId },
    roof: solar?.roof ?? { error: solar?.error },
    gutters: solar?.gutters ?? null,
    footprint: solar?.footprint ?? null,
    walls: {
      estimatedSquareFeet: wallSqFt,
      assumedStoryHeightFeet: assumedStoryHeightFt,
      assumedStories: stories,
      method: 'footprint perimeter × story height × stories (does not subtract openings)',
    },
    openings: {
      totals,
      perSide: sides,
    },
    componentsFromSatellite: satelliteAnalysis,
    imagery: {
      satellite: satellite ? { sourceUrl: satellite.url } : null,
    },
    notes: [
      solar?.error ? `Solar API: ${solar.error}` : null,
      perimeterFt ? null : 'Footprint perimeter unavailable — wall area not estimated.',
    ].filter(Boolean),
  };
}

// Re-exported helpers for thin tool wrappers.
export { geocodeAddress, captureSatelliteImage, captureStreetView, getBuildingInsights, summarizeInsights, countOpenings, identifyComponents, M_TO_FT };
