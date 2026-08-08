/**
 * Vision provider abstraction.
 *
 * Set VISION_PROVIDER env var to choose:
 *   gemini   → Google Gemini Flash (FREE — get key at aistudio.google.com)
 *   ollama   → Local Ollama (FREE — download at ollama.ai, run: ollama pull llama3.2-vision)
 *   anthropic → Claude (paid, best accuracy)
 *
 * Defaults to gemini if GEMINI_API_KEY is set, otherwise anthropic.
 */

// ── Provider selection ────────────────────────────────────────────────────────

function detectProvider() {
  const explicit = (process.env.VISION_PROVIDER || '').toLowerCase();
  if (explicit) return explicit;
  if (process.env.GEMINI_API_KEY) return 'gemini';
  if (process.env.ANTHROPIC_API_KEY) return 'anthropic';
  if (process.env.OLLAMA_HOST || process.env.OLLAMA_MODEL) return 'ollama';
  throw new Error(
    'No vision provider configured. Set one of:\n' +
    '  GEMINI_API_KEY   (free at aistudio.google.com)  → recommended\n' +
    '  ANTHROPIC_API_KEY (claude.ai/settings)\n' +
    '  VISION_PROVIDER=ollama + install Ollama locally (free)',
  );
}

// ── Gemini Flash (free) ───────────────────────────────────────────────────────

async function callGemini({ base64, mimeType, prompt }) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error('GEMINI_API_KEY is not set. Get a free key at aistudio.google.com');

  const model = process.env.GEMINI_MODEL || 'gemini-2.0-flash';
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

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

// ── Ollama (local, 100% free) ─────────────────────────────────────────────────

async function callOllama({ base64, prompt }) {
  const host = process.env.OLLAMA_HOST || 'http://localhost:11434';
  const model = process.env.OLLAMA_MODEL || 'llama3.2-vision';

  const res = await fetch(`${host}/api/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model,
      prompt,
      images: [base64],  // Ollama accepts raw base64
      stream: false,
      options: { temperature: 0.1 },
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(
      `Ollama error ${res.status}: ${err}\n` +
      `Make sure Ollama is running (ollama serve) and the model is pulled (ollama pull ${model})`,
    );
  }

  const data = await res.json();
  return (data.response ?? '').trim();
}

// ── Anthropic Claude (paid) ───────────────────────────────────────────────────

let anthropicClient;
async function callAnthropic({ base64, mimeType, prompt }) {
  if (!anthropicClient) {
    const { default: Anthropic } = await import('@anthropic-ai/sdk');
    const key = process.env.ANTHROPIC_API_KEY;
    if (!key) throw new Error('ANTHROPIC_API_KEY is not set.');
    anthropicClient = new Anthropic({ apiKey: key });
  }
  const model = process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-6';
  const response = await anthropicClient.messages.create({
    model,
    max_tokens: 4096,
    messages: [{
      role: 'user',
      content: [
        { type: 'image', source: { type: 'base64', media_type: mimeType, data: base64 } },
        { type: 'text', text: prompt },
      ],
    }],
  });
  return response.content.map((b) => (b.type === 'text' ? b.text : '')).join('\n').trim();
}

// ── Unified entry point ───────────────────────────────────────────────────────

export async function analyzeImage({ base64, mimeType, prompt }) {
  const provider = detectProvider();
  switch (provider) {
    case 'gemini':    return callGemini({ base64, mimeType, prompt });
    case 'ollama':    return callOllama({ base64, prompt });
    case 'anthropic': return callAnthropic({ base64, mimeType, prompt });
    default: throw new Error(`Unknown VISION_PROVIDER "${provider}". Use: gemini, ollama, or anthropic`);
  }
}

// ── Structured analysis helpers ───────────────────────────────────────────────

const EDGE_ANALYSIS_PROMPT = `You are a professional roofing estimator performing a satellite aerial measurement.

EDGE TYPE DEFINITIONS:
- EAVE: bottom horizontal edge of a roof plane where gutters attach (lowest edge, runs parallel to ground).
- RIDGE: top horizontal peak where two opposing roof planes meet at the highest point.
- HIP: diagonal edge where two roof planes slope DOWNWARD and meet going OUTWARD toward a corner.
- VALLEY: diagonal edge where two planes meet INWARD — looks like a V or trough, water runs toward it.
- RAKE: sloped end edge of a gable roof (slanted edge on the triangular gable end).
- WALL FLASHING: where a roof plane butts against a vertical wall.
- STEP FLASHING: where the roof meets a wall in a stair-step pattern (dormers, chimneys).

YOUR TASK:
1. Identify every roof plane (facet) and every edge.
2. For EACH edge type, estimate TOTAL lineal footage across the entire roof.
3. Count total facets (separate flat planes).
4. Identify the predominant pitch.
5. Count visible downspouts.

SCALE CALIBRATION: A standard car = 15ft. A single garage door = 9ft wide. A door = 3ft wide.

Return ONLY this JSON — no text before or after:
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

export async function analyzeRoofEdges({ base64, mimeType }) {
  const text = await analyzeImage({ base64, mimeType, prompt: EDGE_ANALYSIS_PROMPT });
  return safeParseJson(text);
}

const COUNT_OPENINGS_PROMPT = `You are a building takeoff estimator looking at one facade.
Count only openings visible on THIS facade.
Return ONLY this JSON:
{
  "windows": <integer>,
  "doors": <integer>,
  "garage_doors": <integer>,
  "other_openings": <integer>,
  "stories_visible": <integer>,
  "wall_material_guess": "<brick|vinyl siding|wood siding|stucco|fiber cement|unknown>",
  "notes": "<one sentence>"
}`;

export async function countOpenings({ base64, mimeType }) {
  const text = await analyzeImage({ base64, mimeType, prompt: COUNT_OPENINGS_PROMPT });
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

export async function identifyComponents({ base64, mimeType }) {
  const text = await analyzeImage({ base64, mimeType, prompt: IDENTIFY_COMPONENTS_PROMPT });
  return safeParseJson(text);
}

// ── Utility ───────────────────────────────────────────────────────────────────

function safeParseJson(text) {
  const cleaned = text.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/i, '').trim();
  try {
    return { ok: true, data: JSON.parse(cleaned) };
  } catch {
    return { ok: false, error: 'Vision model did not return valid JSON', raw: text };
  }
}
