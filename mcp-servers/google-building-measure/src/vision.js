// Claude vision wrapper — analyze a building image and return structured findings.

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

// Generic vision call: returns the text response.
export async function analyzeImage({ base64, mimeType, prompt, model = DEFAULT_MODEL }) {
  const anthropic = getClient();
  const response = await anthropic.messages.create({
    model,
    max_tokens: 2048,
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

// Structured opening count from one street-view image.
const COUNT_OPENINGS_PROMPT = `You are a building takeoff estimator looking at a single side of a building.
Identify and COUNT only the openings clearly visible on the building facade in this image.
Return STRICT JSON only, no prose, with this exact shape:
{
  "windows": <integer>,
  "doors": <integer>,
  "garage_doors": <integer>,
  "other_openings": <integer>,
  "notes": "<one short sentence about confidence or obstructions>"
}
Rules:
- Count only what you can see on this one facade.
- Sliding glass doors count as doors, not windows.
- Skylights are "other_openings".
- If unsure between window and door, prefer the more conservative count and note it.`;

export async function countOpenings({ base64, mimeType }) {
  const text = await analyzeImage({ base64, mimeType, prompt: COUNT_OPENINGS_PROMPT });
  return safeParseJson(text);
}

// Structured component identification from a satellite or street view image.
const IDENTIFY_COMPONENTS_PROMPT = `You are a building takeoff estimator analyzing this image of a property.
Identify the visible building components and return STRICT JSON only:
{
  "roof": { "visible": <bool>, "shape": "<gable|hip|flat|shed|complex|unknown>", "material_guess": "<string>", "condition_notes": "<string>" },
  "gutters": { "visible": <bool>, "approximate_runs": <integer>, "notes": "<string>" },
  "downspouts": { "visible": <bool>, "count": <integer>, "notes": "<string>" },
  "walls": { "siding_guess": "<string>", "stories_guess": <integer>, "notes": "<string>" },
  "openings_visible": { "windows": <integer>, "doors": <integer>, "garage_doors": <integer> },
  "obstructions": "<short string describing trees / shadows / occlusion>"
}
If a value cannot be determined, use null or 0 with a note. Do not include any text outside the JSON.`;

export async function identifyComponents({ base64, mimeType }) {
  const text = await analyzeImage({ base64, mimeType, prompt: IDENTIFY_COMPONENTS_PROMPT });
  return safeParseJson(text);
}

function safeParseJson(text) {
  const cleaned = text.replace(/^```(?:json)?\s*/i, '').replace(/```$/i, '').trim();
  try {
    return { ok: true, data: JSON.parse(cleaned) };
  } catch (err) {
    return { ok: false, error: 'Vision model did not return valid JSON', raw: text };
  }
}
