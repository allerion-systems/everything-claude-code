// Roofr-style report assembler.
// Takes Solar API data + vision edge analysis + material calc and composes
// a structured report that mirrors the Roofr PDF output.

import { calculateMaterials, ftInFormat } from './materials.js';

export function assembleReport({ address, geo, solarSummary, edgeAnalysis, componentAnalysis, aerialView, openings }) {
  // ── Edge measurements ────────────────────────────────────────────────────
  // Primary source: vision edge analysis from satellite.
  // Fallback: Solar API approximations for area-based fields.
  const vision = edgeAnalysis?.ok ? edgeAnalysis.data : null;
  const solar = solarSummary?.roof ?? null;

  const totalRoofSqft = solar?.totalAreaSquareFeet ?? null;
  const facets = vision?.facets ?? solar?.segmentCount ?? null;
  const predominantPitch = vision?.predominant_pitch ?? derivePitchFromSegments(solarSummary?.roof?.segments);

  const eavesFt = vision?.eaves_ft ?? null;
  const ridgesFt = vision?.ridges_ft ?? null;
  const hipsFt = vision?.hips_ft ?? null;
  const valleysFt = vision?.valleys_ft ?? null;
  const rakesFt = vision?.rakes_ft ?? null;
  const wallFlashingFt = vision?.wall_flashing_ft ?? 0;
  const stepFlashingFt = vision?.step_flashing_ft ?? 0;
  const transitionsFt = vision?.transitions_ft ?? 0;

  const hipsAndRidges = safeAdd(hipsFt, ridgesFt);
  const eavesAndRakes = safeAdd(eavesFt, rakesFt);

  // ── Pitch breakdown from Solar segments ─────────────────────────────────
  const pitchBreakdown = buildPitchBreakdown(solarSummary?.roof?.segments ?? []);

  // ── Materials ────────────────────────────────────────────────────────────
  let materials = null;
  if (totalRoofSqft && eavesFt !== null) {
    materials = calculateMaterials({
      totalSqft: totalRoofSqft,
      eavesFt: eavesFt ?? 0,
      rakesFt: rakesFt ?? 0,
      hipsFt: hipsFt ?? 0,
      ridgesFt: ridgesFt ?? 0,
      valleysFt: valleysFt ?? 0,
      wallFlashingFt,
      stepFlashingFt,
    });
  }

  // ── Openings aggregate ───────────────────────────────────────────────────
  const openingTotals = { windows: 0, doors: 0, garage_doors: 0, other_openings: 0 };
  const perSide = openings?.perSide ?? [];
  for (const side of perSide) {
    if (side.openings?.ok && side.openings.data) {
      for (const k of Object.keys(openingTotals)) {
        openingTotals[k] += Number(side.openings.data[k] || 0);
      }
    }
  }

  const comp = componentAnalysis?.ok ? componentAnalysis.data : null;

  return {
    address: {
      input: address,
      resolved: geo?.formattedAddress,
      lat: geo?.location?.lat,
      lng: geo?.location?.lng,
    },
    summary: {
      totalRoofAreaSqft: totalRoofSqft,
      pitchedAreaSqft: totalRoofSqft,
      flatAreaSqft: 0,
      totalFacets: facets,
      predominantPitch,
      imageryDate: solarSummary?.imageryDate ?? null,
      imageryQuality: solarSummary?.imageryQuality ?? null,
    },
    lengths: {
      eaves: eavesFt !== null ? { ft: eavesFt, formatted: ftInFormat(eavesFt), note: 'Gutter line' } : null,
      ridges: ridgesFt !== null ? { ft: ridgesFt, formatted: ftInFormat(ridgesFt) } : null,
      hips: hipsFt !== null ? { ft: hipsFt, formatted: ftInFormat(hipsFt) } : null,
      valleys: valleysFt !== null ? { ft: valleysFt, formatted: ftInFormat(valleysFt) } : null,
      rakes: rakesFt !== null ? { ft: rakesFt, formatted: ftInFormat(rakesFt) } : null,
      wallFlashing: { ft: wallFlashingFt, formatted: ftInFormat(wallFlashingFt) },
      stepFlashing: { ft: stepFlashingFt, formatted: ftInFormat(stepFlashingFt) },
      transitions: { ft: transitionsFt, formatted: ftInFormat(transitionsFt) },
      parapetWall: { ft: 0, formatted: '0ft 0in' },
      // Combined totals (used for ordering materials)
      hipsAndRidges: hipsAndRidges !== null ? { ft: hipsAndRidges, formatted: ftInFormat(hipsAndRidges) } : null,
      eavesAndRakes: eavesAndRakes !== null ? { ft: eavesAndRakes, formatted: ftInFormat(eavesAndRakes) } : null,
    },
    pitchBreakdown,
    facetDetails: (solarSummary?.roof?.segments ?? []).map((seg) => ({
      index: seg.index,
      areaSquareFeet: seg.areaSquareFeet,
      pitchDegrees: seg.pitchDegrees,
      pitch: degToPitch(seg.pitchDegrees),
      azimuthDegrees: seg.azimuthDegrees,
      facingDirection: azimuthToDirection(seg.azimuthDegrees),
    })),
    exteriorComponents: {
      roofShape: comp?.roof?.shape ?? null,
      roofMaterialGuess: comp?.roof?.material_guess ?? null,
      guttersVisible: comp?.gutters?.visible ?? null,
      gutterApproxRuns: comp?.gutters?.approximate_runs ?? null,
      downspoutsCount: vision?.downspouts_visible ?? comp?.downspouts?.count ?? null,
      chimneys: comp?.chimneys ?? null,
      skylights: comp?.skylights ?? null,
      dormers: comp?.dormers ?? null,
      wallMaterialGuess: comp?.walls?.siding_guess ?? null,
      stories: comp?.walls?.stories_guess ?? null,
    },
    openings: {
      totals: openingTotals,
      perSide,
    },
    footprint: solarSummary?.footprint ?? null,
    wallEstimate: buildWallEstimate(solarSummary?.footprint, comp?.walls?.stories_guess),
    materials,
    aerialView: aerialView ?? null,
    dataQuality: {
      edgeAnalysisConfidence: vision?.confidence ?? 'none',
      edgeScaleReference: vision?.scale_reference_used ?? null,
      solarApiCovered: !!solar,
      warnings: buildWarnings({ solar, vision, totalRoofSqft }),
    },
  };
}

// ── helpers ──────────────────────────────────────────────────────────────

function buildPitchBreakdown(segments) {
  const map = {};
  for (const seg of segments) {
    const pitch = degToPitch(seg.pitchDegrees);
    if (!map[pitch]) map[pitch] = { pitch, areaSquareFeet: 0, facets: 0 };
    map[pitch].areaSquareFeet += seg.areaSquareFeet;
    map[pitch].facets += 1;
  }
  return Object.values(map).sort((a, b) => b.areaSquareFeet - a.areaSquareFeet);
}

function derivePitchFromSegments(segments = []) {
  if (!segments.length) return null;
  const dominant = segments.reduce((a, b) => (a.areaSquareFeet > b.areaSquareFeet ? a : b));
  return degToPitch(dominant.pitchDegrees);
}

function degToPitch(degrees) {
  if (degrees == null) return 'unknown';
  // rise/12 from pitch angle: rise = 12 * tan(angle)
  const rise = Math.round(12 * Math.tan((degrees * Math.PI) / 180));
  return `${rise}/12`;
}

function azimuthToDirection(az) {
  if (az == null) return null;
  const dirs = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
  return dirs[Math.round(az / 45) % 8];
}

function safeAdd(a, b) {
  if (a == null || b == null) return null;
  return Math.round((a + b) * 10) / 10;
}

function buildWallEstimate(footprint, stories = 1) {
  if (!footprint?.approxPerimeterFeet) return null;
  const storyH = 10; // ft
  const storyCount = Math.max(1, stories || 1);
  return {
    estimatedSquareFeet: Math.round(footprint.approxPerimeterFeet * storyH * storyCount),
    perimeter: ftInFormat(footprint.approxPerimeterFeet),
    assumedStoryHeightFt: storyH,
    stories: storyCount,
    note: 'Gross wall area — does not subtract openings.',
  };
}

function buildWarnings({ solar, vision, totalRoofSqft }) {
  const w = [];
  if (!solar) w.push('Solar API returned no data — edge lengths from vision only.');
  if (!vision) w.push('Vision edge analysis failed — lineal footage fields are null.');
  if (!totalRoofSqft) w.push('Total roof area unavailable — materials cannot be calculated.');
  if (vision && vision.confidence === 'low') w.push('Vision confidence is LOW — manual verification recommended.');
  return w;
}
