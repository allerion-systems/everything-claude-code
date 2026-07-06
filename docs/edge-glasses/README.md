# EdgeGlass — a G-Stack edge AI agentic task force

An on-device, privacy-first agent runtime for AR smart glasses. It turns what
the wearer sees and hears into safe, useful actions using a **local** model —
no cloud, no metered tokens, no raw frames leaving the device.

> Built to match this repo's ethos: zero runtime dependencies, plain Node.js,
> hand-rolled tests. Everything here runs offline out of the box.

## Why "no tokens"

The brain is a model running on the wearer's own hardware (Ollama or a
llama.cpp server on `localhost`, e.g. a **Hermes** GGUF). Because the runtime
only ever talks to a loopback endpoint, no prompt or sensor frame is ever sent
to a paid API. A built-in offline responder means the whole task force runs
even with no model server present — that is how the tests and the demo run.

```bash
# Offline demo (no server, deterministic, zero tokens)
node scripts/edge-glasses.js
npm run edge-glasses

# Machine-readable trace
node scripts/edge-glasses.js --json

# Drive a real local model
GLASS_MODEL_ENDPOINT=http://127.0.0.1:11434 GLASS_MODEL=hermes \
  node scripts/edge-glasses.js
```

## The G-Stack

Five layers, each starting with **G**, from lens to network:

| Layer | Component | Responsibility |
|-------|-----------|----------------|
| **G**lass | `task-force.js`, `perception.js`, `hud.js` | On-lens perceive → plan → act loop, HUD/voice output |
| **G**uardian | `guardrails.js` | Consent, PII redaction, attention safety — every action is vetted here |
| **G**GUF | `local-model.js` | Local Hermes model over localhost (Ollama / llama.cpp); zero cloud tokens |
| **G**raph | `task-force.js` | The bounded multi-agent task graph (Planner, Perception, Action, Memory, Guardian) |
| **G**ateway | `docs/edge-glasses/network.md` | Edge mesh: lens ↔ phone hub ↔ optional home node, offline-first |

## The agentic task force

One `tick()` is a full perceive → plan → act cycle, run against a per-stage
millisecond budget so a wearable never answers late:

```
frame ─▶ Perception ─▶ scene summary
                          │
                    Guardian (privacy/safety pre-check)
                          │
                       Planner (local model → bounded plan of ≤3 tool calls)
                          │
                    Guardian (screen every action)
                          │
              ┌───────────┼───────────┐
           allowed      blocked     deferred
              │
           Action (local tool registry) ─▶ HUD + voice ─▶ Memory
```

Roles:

- **Perception** — sensor frames become text-only observations on-device; raw
  frames are never retained. Capture modalities are consent-gated.
- **Guardian** — the safety/ethics core (see below). Nothing reaches the world
  without passing through it.
- **Planner** — the local model proposes a short JSON plan of tool calls.
- **Action** — executes only the *allowed* calls against a registry of safe,
  local tools (`translate.local`, `navigate.hint`, `remember.note`, …).
- **Memory** — appends an episodic trace for the reflection loop.

## Guardian: controlled, ethical, by construction

The defaults are deliberately conservative:

- **No covert recording.** Camera/mic capture requires an explicit consent
  grant, and covert capture is always refused.
- **PII never leaves the device unredacted.** Outbound text is scrubbed of
  emails, phone numbers, card- and SSN-like patterns before sharing. The
  redaction metadata stores only a label and length — never the raw value.
- **Attention safety.** Non-critical UI defers while the wearer's attention is
  committed (crossing a street, driving). Only critical alerts interrupt.
- **Unknown actions ask first.** Anything the policy doesn't recognize needs
  wearer confirmation instead of running on a guess.

## Improve yourself: the reflection loop

Between glances, `reflection.js` mines the episodic trace for two kinds of
improvement — advisory only, never auto-applied:

1. **Reflexes** — a scene signature that reliably produced the same allowed
   action becomes a cached shortcut, letting the next matching tick skip the
   planner entirely and stay inside the latency budget.
2. **Policy hints** — an action the Guardian keeps blocking or deferring is
   surfaced as a one-time consent prompt or a replay suggestion, so the wearer
   is asked once instead of being silently thwarted.

## Latency budget

Default budgets (ms) for one ~1.2s glance loop, tracked per stage with graceful
degradation:

| Stage | Budget |
|-------|--------|
| perceive | 250 |
| guard | 60 |
| plan | 500 |
| act | 300 |
| render | 90 |

## Local model setup (optional)

```bash
# Ollama
ollama pull hermes3
ollama serve                       # http://127.0.0.1:11434
GLASS_MODEL_ENDPOINT=http://127.0.0.1:11434 GLASS_MODEL=hermes3 npm run edge-glasses

# llama.cpp OpenAI-compatible server
./server -m hermes.gguf --port 8080
GLASS_MODEL_ENDPOINT=http://127.0.0.1:8080 GLASS_MODEL=hermes npm run edge-glasses
```

The client auto-detects Ollama (`/api/chat`) vs OpenAI-compatible
(`/v1/chat/completions`) from the endpoint.

## Consent (privacy-first, everything off by default)

```bash
GLASS_GRANTS=capture.camera,capture.audio,share.external node scripts/edge-glasses.js
```

Recognized capabilities: `capture.camera`, `capture.audio`, `share.external`,
`identify.people`, `store.location`. With no grants, perception captures
nothing — the privacy default.

## Hardware & network

- [`hardware/glasses-mount.scad`](hardware/glasses-mount.scad) — a parametric,
  3D-printable clip that mounts the compute puck + camera to a temple arm.
- [`hardware/bill-of-materials.md`](hardware/bill-of-materials.md) — parts list.
- [`network.md`](network.md) — the edge-mesh network that supports it.

## Tests

```bash
node tests/lib/edge-glasses/guardrails.test.js
node tests/lib/edge-glasses/task-force.test.js
node tests/scripts/edge-glasses.test.js
# ...or the whole suite:
node tests/run-all.js
```

## Files

```
scripts/edge-glasses.js                 # CLI demo runner
scripts/lib/edge-glasses/
  latency-budget.js                     # per-stage ms budgets
  guardrails.js                         # Guardian: consent, PII, attention
  perception.js                         # consent-gated sensor hub
  local-model.js                        # local Hermes client + offline responder
  hud.js                                # glanceable HUD + voice renderer
  reflection.js                         # self-improvement loop
  task-force.js                         # the multi-agent orchestrator
```
