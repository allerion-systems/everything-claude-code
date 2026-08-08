// Gemini vision wrapper — Worker-compatible (fetch only, no SDK).
// Free tier: 15 req/min, 1M tokens/day on gemini-2.0-flash.

const DEFAULT_MODEL = 'gemini-2.0-flash';

async function callGemini({ base64, mimeType, prompt, geminiKey, model = DEFAULT_MODEL }) {
  if (!geminiKey) throw new Error('GEMINI_API_KEY is not set on this Worker.');
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${geminiKey}`;
  const body = {
    contents: [{
      parts: [
        { inline_data: { mime_type: mimeType, data: base64 } },
        { text: prompt },
      ],
    }],
    generationConfig: { maxOutputTokens: 4096, temperature: 0.1 },
  };
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Gemini API error ${res.status}: ${err}`);
  }
  const data = await res.json();
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
  if (!text) throw new Error('Gemini returned empty response');
  return text.trim();
}

const EDGE_ANALYSIS_PROMPT = `You are a professional roofing estimator performing a satellite aerial measurement.

EDGE TYPE DEFINITIONS:
- EAVE: bottom horizontal edge of a roof plane where gutters attach (lowest edge).
- RIDGE: top horizontal peak where two opposing roof planes meet.
- HIP: diagonal edge where two planes slope DOWNWARD and meet going OUTWARD toward a corner.
- VALLEY: diagonal edge where two planes meet INWARD — looks like a V or trough.
- RAKE: sloped end edge of a gable roof (slanted side of triangular gable end).
- WALL FLASHING: where a roof plane butts against a vertical wall.
- STEP FLASHING: where the roof meets a wall in a stair-step pattern.

TASK:
1. Identify every roof plane (facet) and every edge.
2. For EACH edge type, estimate TOTAL lineal footage.
3. Count total facets.
4. Identify the predominant pitch.
5. Count visible downspouts.

SCALE: A car = 15ft. Single garage door = 9ft wide. Door = 3ft wide.

Return ONLY this JSON (no markdown fences, no commentary):
{
  "facets": <integer>,
  "eaves_ft": <number>,
  "ridges_ft": <number>,
  "hips_ft": <number>,
  "valleys_ft": <number>,
  "rakes_ft": <number>,
  "wall_flashing_ft": <number>,
  "step_flashing_ft": <number>,
  "transitions_ft": <number>,
  "parapet_wall_ft": <number>,
  "predominant_pitch": "<e.g. 6/12 or 12/12>",
  "downspouts_visible": <integer>,
  "confidence": "high|medium|low",
  "scale_reference_used": "<what you used to calibrate>"
}`;

export async function analyzeRoofEdges({ base64, mimeType, geminiKey }) {
  const text = await callGemini({ base64, mimeType, prompt: EDGE_ANALYSIS_PROMPT, geminiKey });
  return safeParseJson(text);
}

const COUNT_OPENINGS_PROMPT = `You are a building takeoff estimator looking at one facade of a building.
Count only openings visible on THIS facade. Return ONLY this JSON:
{
  "windows": <integer>,
  "doors": <integer>,
  "garage_doors": <integer>,
  "other_openings": <integer>,
  "stories_visible": <integer>,
  "wall_material_guess": "<brick|vinyl siding|wood siding|stucco|fiber cement|unknown>",
  "notes": "<one sentence>"
}`;

export async function countOpenings({ base64, mimeType, geminiKey }) {
  const text = await callGemini({ base64, mimeType, prompt: COUNT_OPENINGS_PROMPT, geminiKey });
  return safeParseJson(text);
}

const IDENTIFY_COMPONENTS_PROMPT = `You are a roofing and exterior estimator.
Analyze this aerial/satellite image and return ONLY this JSON:
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

export async function identifyComponents({ base64, mimeType, geminiKey }) {
  const text = await callGemini({ base64, mimeType, prompt: IDENTIFY_COMPONENTS_PROMPT, geminiKey });
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
