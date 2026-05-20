// Material estimator — mirrors the Roofr "Material calculations" page.
// All formulas follow standard roofing industry conventions.

// ── constants ──────────────────────────────────────────────────────────────
const SQFT_PER_BUNDLE = 33.3;          // 3 bundles = 1 square = 100 sqft
const STARTER_LF_PER_BUNDLE = 105;     // ~105 lf per starter bundle
const ICE_WATER_SQFT_PER_ROLL = 75;    // typical 2-square roll
const SYNTHETIC_SQFT_PER_ROLL = 1000;  // 10-square roll
const RIDGE_CAP_LF_PER_BUNDLE = 25;
const DRIP_EDGE_LF_PER_PIECE = 10;
const VALLEY_METAL_LF_PER_PIECE_8FT = 8;
const VALLEY_METAL_LF_PER_PIECE_10FT = 10;

const WASTE_PRESETS = [0, 0.10, 0.12, 0.15, 0.17, 0.20, 0.22];

export function calculateMaterials({ totalSqft, eavesFt = 0, rakesFt = 0, hipsFt = 0, ridgesFt = 0, valleysFt = 0, wallFlashingFt = 0, stepFlashingFt = 0 }) {
  const eavesAndRakes = eavesFt + rakesFt;
  const hipsAndRidges = hipsFt + ridgesFt;
  // Ice & water covers eaves (first 3–6 ft), valleys, wall/step flashing runs.
  const iceWaterLf = eavesFt + valleysFt + wallFlashingFt + stepFlashingFt;

  const wasteTable = WASTE_PRESETS.map((pct) => {
    const grossSqft = Math.ceil(totalSqft * (1 + pct));
    return {
      wastePercent: Math.round(pct * 100),
      grossSquareFeet: grossSqft,
      squares: round(grossSqft / 100),
      shingleBundles: {
        'IKO Cambridge': bundles(grossSqft, 1.0),
        'CertainTeed Landmark': bundles(grossSqft, 1.0),
        'GAF Timberline HDZ': bundles(grossSqft, 1.0),
        'Owens Corning Duration': bundles(grossSqft, 1.0),
      },
    };
  });

  return {
    baseMeasurements: {
      totalSqft,
      eavesAndRakesFt: round(eavesAndRakes),
      hipsAndRidgesFt: round(hipsAndRidges),
      valleysFt: round(valleysFt),
      iceWaterCoverageLf: round(iceWaterLf),
    },
    wasteScenarios: wasteTable,
    recommended: {
      wastePercent: 15,
      note: 'Industry standard for complex residential roofs. Use 10% for simple gable.',
    },
    lineItems: {
      starter: {
        coverageLf: round(eavesAndRakes),
        bundles: Math.ceil(eavesAndRakes / STARTER_LF_PER_BUNDLE),
        products: ['IKO Leading Edge Plus', 'GAF Pro-Start', 'Owens Corning Starter Strip'],
      },
      iceAndWaterShield: {
        coverageLf: round(iceWaterLf),
        rolls: Math.ceil((iceWaterLf * 3) / ICE_WATER_SQFT_PER_ROLL), // ~3 sqft per lf at 36" wide
        products: ['IKO StormShield', 'CertainTeed WinterGuard', 'GAF WeatherWatch', 'Owens Corning WeatherLock'],
      },
      syntheticUnderlayment: {
        totalSqft: round(totalSqft),
        rolls: Math.ceil(totalSqft / SYNTHETIC_SQFT_PER_ROLL),
        products: ['IKO Stormtite', 'GAF Deck-Armor', 'Owens Corning RhinoRoof'],
      },
      ridgeCaps: {
        coverageLf: round(hipsAndRidges),
        bundles: Math.ceil(hipsAndRidges / RIDGE_CAP_LF_PER_BUNDLE),
        products: ['IKO Hip and Ridge', 'GAF Seal-A-Ridge', 'Owens Corning DecoRidge'],
      },
      dripEdge: {
        coverageLf: round(eavesAndRakes),
        pieces10ft: Math.ceil(eavesAndRakes / DRIP_EDGE_LF_PER_PIECE),
        note: '10ft pieces; covers eaves + rakes',
      },
      valleyMetal: {
        coverageLf: round(valleysFt),
        pieces8ft: Math.ceil(valleysFt / VALLEY_METAL_LF_PER_PIECE_8FT),
        pieces10ft: Math.ceil(valleysFt / VALLEY_METAL_LF_PER_PIECE_10FT),
      },
    },
  };
}

function bundles(grossSqft, coverageFactor = 1.0) {
  return Math.ceil((grossSqft * coverageFactor) / SQFT_PER_BUNDLE);
}

function round(n, digits = 1) {
  const m = Math.pow(10, digits);
  return Math.round(n * m) / m;
}

export function ftInFormat(totalFt) {
  const ft = Math.floor(totalFt);
  const inches = Math.round((totalFt - ft) * 12);
  return `${ft}ft ${inches}in`;
}
