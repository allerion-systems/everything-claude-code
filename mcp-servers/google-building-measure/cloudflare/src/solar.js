// Google Solar API — buildingInsights endpoint.
// Docs: https://developers.google.com/maps/documentation/solar/building-insights

const BUILDING_INSIGHTS_URL = 'https://solar.googleapis.com/v1/buildingInsights:findClosest';

const M2_TO_FT2 = 10.7639;
const M_TO_FT = 3.28084;

export async function getBuildingInsights({ lat, lng, apiKey, quality = 'HIGH' }) {
  const url = `${BUILDING_INSIGHTS_URL}?location.latitude=${lat}&location.longitude=${lng}&requiredQuality=${quality}&key=${apiKey}`;
  const res = await fetch(url);
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Solar API buildingInsights failed: ${res.status} ${body}`);
  }
  return res.json();
}

export function summarizeInsights(insights) {
  const solar = insights?.solarPotential;
  if (!solar) {
    return { error: 'No solarPotential returned (building may not be covered by Solar API).', raw: insights };
  }

  const roofSegments = (solar.roofSegmentStats || []).map((seg, i) => {
    const areaM2 = seg.stats?.areaMeters2 ?? 0;
    const pitchDeg = seg.pitchDegrees ?? 0;
    const aspect = 2;
    const widthM = Math.sqrt(areaM2 / aspect);
    const lengthM = widthM * aspect;
    const perimeterM = 2 * (widthM + lengthM);
    return {
      index: i,
      pitchDegrees: pitchDeg,
      azimuthDegrees: seg.azimuthDegrees ?? null,
      areaSquareMeters: round(areaM2),
      areaSquareFeet: round(areaM2 * M2_TO_FT2),
      approxPerimeterFeet: round(perimeterM * M_TO_FT),
      planeHeightMeters: round(seg.planeHeightAtCenterMeters ?? 0),
    };
  });

  const totalRoofAreaM2 = solar.wholeRoofStats?.areaMeters2 ?? roofSegments.reduce((a, s) => a + s.areaSquareMeters, 0);
  const totalRoofAreaFt2 = totalRoofAreaM2 * M2_TO_FT2;

  const gutterLinealFeet = roofSegments.reduce((sum, s) => {
    const aspect = 2;
    const widthM = Math.sqrt(s.areaSquareMeters / aspect);
    const lengthM = widthM * aspect;
    return sum + (2 * lengthM * M_TO_FT);
  }, 0);

  const buildingFootprintM2 = solar.buildingStats?.areaMeters2 ?? totalRoofAreaM2;
  const footprintFt2 = buildingFootprintM2 * M2_TO_FT2;
  const footprintPerimeterFt = 2 * Math.sqrt(buildingFootprintM2) * 2 * M_TO_FT;

  return {
    name: insights.name,
    center: insights.center,
    imageryQuality: insights.imageryQuality,
    imageryDate: insights.imageryDate,
    roof: {
      totalAreaSquareMeters: round(totalRoofAreaM2),
      totalAreaSquareFeet: round(totalRoofAreaFt2),
      segmentCount: roofSegments.length,
      segments: roofSegments,
    },
    gutters: {
      estimatedLinealFeet: round(gutterLinealFeet),
      method: 'sum of approximated eave edges per roof segment',
    },
    footprint: {
      areaSquareMeters: round(buildingFootprintM2),
      areaSquareFeet: round(footprintFt2),
      approxPerimeterFeet: round(footprintPerimeterFt),
    },
  };
}

function round(n, digits = 1) {
  const m = Math.pow(10, digits);
  return Math.round(n * m) / m;
}
