'use strict';

/**
 * Perception hub for the edge glasses.
 *
 * Sensor frames (camera, microphone, on-lens OCR) are converted to compact,
 * text-only *observations* on-device. Raw frames are never retained — only the
 * derived, redactable text moves forward. Capture-bearing modalities are gated
 * on consent so the hub is privacy-first by construction.
 *
 * Providers are plain functions: (frame, ctx) => observation | observation[].
 * The mock providers here let the whole stack run offline and in tests.
 */

const { hasConsent } = require('./guardrails');

// Modalities and the consent capability each one requires to run.
const MODALITY_CONSENT = {
  camera: 'capture.camera',
  audio: 'capture.audio',
  ocr: 'capture.camera'
};

function clampConfidence(value) {
  if (typeof value !== 'number' || Number.isNaN(value)) return 0;
  return Math.max(0, Math.min(1, value));
}

function normalizeObservation(modality, raw, now) {
  if (raw === null || raw === undefined) return null;
  const obs = typeof raw === 'string' ? { text: raw } : raw;
  const text = String(obs.text || '').trim();
  if (!text) return null;
  return {
    modality,
    text,
    confidence: clampConfidence(obs.confidence ?? 0.5),
    ts: obs.ts ?? now()
  };
}

/**
 * A registry of sensor providers plus the consent-aware perceive loop.
 */
class SensorHub {
  constructor({ grants = [], now = Date.now } = {}) {
    this.providers = new Map();
    this.grants = grants;
    this.now = now;
  }

  register(modality, provider) {
    this.providers.set(modality, provider);
    return this;
  }

  /**
   * Run every registered provider whose modality is consented for this frame,
   * returning a flat, confidence-sorted list of observations.
   */
  perceive(frame = {}, ctx = {}) {
    const grants = ctx.grants || this.grants;
    const observations = [];
    const skipped = [];

    for (const [modality, provider] of this.providers) {
      const required = MODALITY_CONSENT[modality];
      if (required && !hasConsent(required, grants)) {
        skipped.push({ modality, reason: `no consent for ${required}` });
        continue;
      }
      let produced;
      try {
        produced = provider(frame[modality] ?? frame, { ...ctx, now: this.now });
      } catch (err) {
        skipped.push({ modality, reason: `provider error: ${err.message}` });
        continue;
      }
      const list = Array.isArray(produced) ? produced : [produced];
      for (const item of list) {
        const normalized = normalizeObservation(modality, item, this.now);
        if (normalized) observations.push(normalized);
      }
    }

    observations.sort((a, b) => b.confidence - a.confidence);
    return { observations, skipped };
  }
}

/**
 * Collapse observations into a short scene string within a character budget —
 * this is what the planner actually reads, so it must be dense and cheap.
 */
function summarizeScene(observations, { maxChars = 240 } = {}) {
  if (!observations || observations.length === 0) return 'scene: (nothing salient)';
  const parts = observations.map(o => `${o.modality}:${o.text} (${o.confidence.toFixed(2)})`);
  let scene = `scene: ${parts.join('; ')}`;
  if (scene.length > maxChars) scene = scene.slice(0, maxChars - 1) + '…';
  return scene;
}

// ── Mock providers — deterministic stand-ins for real edge sensors ──────────

/**
 * Fake vision captioner: echoes a caption supplied on the frame, or a default.
 */
function mockCameraProvider(frameSlice) {
  const caption = frameSlice && frameSlice.caption ? frameSlice.caption : 'an indoor scene';
  return { text: caption, confidence: frameSlice && frameSlice.confidence ? frameSlice.confidence : 0.72 };
}

/**
 * Fake speech-to-text: echoes a transcript supplied on the frame.
 */
function mockAudioProvider(frameSlice) {
  if (!frameSlice || !frameSlice.transcript) return null;
  return { text: frameSlice.transcript, confidence: frameSlice.confidence ?? 0.66 };
}

/**
 * Fake on-lens OCR: returns detected text lines.
 */
function mockOcrProvider(frameSlice) {
  if (!frameSlice || !frameSlice.text) return null;
  const lines = Array.isArray(frameSlice.text) ? frameSlice.text : [frameSlice.text];
  return lines.map(line => ({ text: line, confidence: 0.8 }));
}

function createMockHub(opts = {}) {
  return new SensorHub(opts).register('camera', mockCameraProvider).register('audio', mockAudioProvider).register('ocr', mockOcrProvider);
}

module.exports = {
  MODALITY_CONSENT,
  SensorHub,
  summarizeScene,
  mockCameraProvider,
  mockAudioProvider,
  mockOcrProvider,
  createMockHub
};
