// Claude vision wrapper — analyze building imagery and return structured findings.

import Anthropic from '@anthropic-ai/sdk';

const DEFAULT_MODEL = process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-6';

let client;
function getClient() {
  if (!client) {
    if (!process.env.ANTHROPIC_API_KEY) {
      throw new Error('ANTHROPIC_API_KEY is required for vision analysis.');
    }
    client = new Anthropic();
  }
  return client;
}

export async function analyzeImage({ base64, mimeType, prompt, model = DEFAULT_MODEL }) {
  const anthropic = getClient();
  const response = await anthropic.messages.create({
    model,
    max_tokens: 4096,
    messages: [
      {
        role: 'user',
        content: [
          { type: 'image', source: { type: 'base64', media_type: mimeType, data: base64 } },
          { type: 'text', text: prompt },
        ],
      },
    ],
  });
  return response.content.map((b) => (b.type === 'text' ? b.text : '')).join('\n').trim();
}

// ── Roof edge analysis (satellite / aerial view) ──────────────────────────
// This is the core measurement: classify every visible edge as eave / ridge /
// hip / valley / rake / wall-flashing / step-flashing and estimate lineal feet.
const EDGE_ANALYSIS_PROMPT = `You are a professional roofing estimator performing a satellite aerial measurement.

EDGE TYPE DEFINITIONS (memorize these):
- EAVE: the bottom horizontal edge of a roof plane where gutters attach; runs parallel to the ground.
- RIDGE: the top horizontal peak where two opposing roof planes meet at the highest point.
- HIP: a diagonal edge where two roof planes slope DOWNWARD and meet going OUTWARD toward a corner — creates a pyramid-like shape.
- VALLEY: a diagonal edge where two roof planes slope INWARD and meet — looks like a "V" or trough, water flows toward it.
- RAKE: the sloped end edge of a gable roof (the slanted side on the triangular gable end).
- WALL FLASHING: where the roof plane butts up against a vertical wall.
- STEP FLASHING: where the roof plane meets a wall in a stair-step pattern (often at dormers or chimneys).

YOUR TASK:
1. Examine the satellite image carefully. Identify every roof plane (facet) and every edge.
2. For EACH edge type, estimate the TOTAL lineal footage across the entire roof.
3. Count the total number of roof facets (separate flat planes).
4. Identify the pitch (slope) of the predominant roof plane if possible from shadows/proportions.
5. Note how many downspouts are visible (usually at corners of the eave line).

SCALE CALIBRATION: Look for a car, driveway, or door opening to calibrate scale.
A standard car is ~15ft long. A single-car garage door is ~9ft wide.
A standard door is ~3ft wide. Use these to scale your lineal-foot estimates.

Return ONLY this JSON — no text before or after:
{
  "facets": <integer — total number of separate roof planes>,
  "eaves_ft": <number — total linear feet of eave edges (= gutter line)>,
  "ridges_ft": <number — total linear feet of ridge edges>,
  "hips_ft": <number — total linear feet of hip edges>,
  "valleys_ft": <number — total linear feet of valley edges>,
  "rakes_ft": <number — total linear feet of rake edges>,
  "wall_flashing_ft": <number — total linear feet>,
  "step_flashing_ft": <number — total linear feet>,
  "transitions_ft": <number — roof plane transitions, 0 if none visible>,
  "parapet_wall_ft": <number — 0 for typical pitched residential>,
  "predominant_pitch": "<e.g. 6/12 or 12/12 — best guess from shadows>",
  "downspouts_visible": <integer>,
  "confidence": "high|medium|low",
  "scale_reference_used": "<what you used to calibrate, e.g. 'driveway car'>"
}`;

export async function analyzeRoofEdges({ base64, mimeType }) {
  const text = await analyzeImage({ base64, mimeType, prompt: EDGE_ANALYSIS_PROMPT });
  return safeParseJson(text);
}

// ── Opening count (street view) ───────────────────────────────────────────
const COUNT_OPENINGS_PROMPT = `You are a building takeoff estimator looking at one facade of a building.
Count only the openings clearly visible on THIS facade.
Return ONLY this JSON:
{
  "windows": <integer>,
  "doors": <integer>,
  "garage_doors": <integer>,
  "other_openings": <integer>,
  "stories_visible": <integer>,
  "wall_material_guess": "<brick|vinyl siding|wood siding|stucco|fiber cement|unknown>",
  "notes": "<one sentence about confidence or obstructions>"
}`;

export async function countOpenings({ base64, mimeType }) {
  const text = await analyzeImage({ base64, mimeType, prompt: COUNT_OPENINGS_PROMPT });
  return safeParseJson(text);
}

// ── Full component identification (satellite) ─────────────────────────────
const IDENTIFY_COMPONENTS_PROMPT = `You are a roofing and exterior estimator.
Analyze this aerial/satellite image of a property and return ONLY this JSON:
{
  "roof": {
    "shape": "<gable|hip|gambrel|mansard|shed|flat|complex>",
    "material_guess": "<asphalt shingle|metal|tile|flat membrane|unknown>",
    "color_guess": "<string>",
    "condition_notes": "<string>"
  },
  "gutters": { "visible": <bool>, "approximate_runs": <integer>, "style_guess": "<K-style|half-round|unknown>" },
  "downspouts": { "visible": <bool>, "count": <integer> },
  "walls": { "siding_guess": "<string>", "stories_guess": <integer> },
  "chimneys": <integer>,
  "skylights": <integer>,
  "dormers": <integer>,
  "obstructions": "<trees, shadows, occlusion>"
}`;

export async function identifyComponents({ base64, mimeType }) {
  const text = await analyzeImage({ base64, mimeType, prompt: IDENTIFY_COMPONENTS_PROMPT });
  return safeParseJson(text);
}

function safeParseJson(text) {
  const cleaned = text.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/i, '').trim();
  try {
    return { ok: true, data: JSON.parse(cleaned) };
  } catch {
    return { ok: false, error: 'Vision model did not return valid JSON', raw: text };
  }
}
