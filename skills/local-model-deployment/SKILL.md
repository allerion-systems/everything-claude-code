---
name: local-model-deployment
description: Plan secure, hardware-aware local model hosting, application routing, semantic memory, remote access, and optional voice or digital-twin workloads.
origin: ECC
---

# Local Model Deployment

Use this skill when a user wants to reduce API costs by hosting models on their
own workstation and connecting them to an application. Produce a measured,
reversible deployment plan; never imply access to hardware that the session does
not have.

## Workflow

### 1. Establish the boundary

Identify the application, host OS, users, data sensitivity, latency and
concurrency goals, remote-access need, and maximum local and cloud spend. Split
language inference, retrieval memory, tools, audio/video capture, and simulation
into separate workloads and trust boundaries.

### 2. Inventory before selection

Collect CPU, RAM, GPU and VRAM, driver, free disk, filesystem, and existing
container or model runtimes with read-only commands. Redact identifiers. Do not
use SSD capacity or marketing model names as a proxy for inference capability.

Build a compatibility matrix with `supported`, `uncertain`, or `unsuitable` for
each runtime and model. Explain the measured constraint behind every rating.
Ollama can be considered for a simple local OpenAI-compatible service, llama.cpp
for portable CPU or mixed-hardware use, and vLLM only after verifying the current
platform and accelerator support. Verify current vendor documentation rather
than relying on remembered version requirements.

### 3. Prove the minimum stack

Start with one pinned, commercially compatible instruct model plus one embedding
model. Bind the service to loopback, move replaceable weights and indexes to the
chosen data drive, and keep secrets outside that directory. Benchmark time to
first token, generation rate, memory use, representative-task quality, and
thermal stability. Record model identifiers, quantization, checksums, runtime
versions, expected output, and rollback.
Download only from trusted registries, compare digests with publisher metadata,
prefer data-only tensor formats where supported, and disable untrusted remote
model code and plugins.

### 4. Integrate through a gateway

Put an authenticated server-side gateway between the application and inference
providers. Present a narrow OpenAI-compatible contract when that reduces client
coupling. Define streaming, timeouts, cancellation, bounded retries, health
checks, structured errors, rate limits, and request correlation without logging
sensitive prompt content.
Encrypt non-loopback traffic with TLS, prefer service identities for machine
calls, rotate and revoke credentials, and use deny-by-default network ACLs.

Route suitable work locally. A cloud fallback must be explicit, constrained by a
data-egress policy and spending cap, observable, and safe to disable. Never put a
local endpoint or provider token in browser code.

### 5. Add memory deliberately

Semantic memory is retrieval, not perfect recall. Ingest only named sources and
store provenance with each chunk. Define tenant isolation, encryption, retention,
expiry, correction, export, and deletion before ingestion. Treat retrieved text
as untrusted data and prevent it from overriding system or tool policy. Raw
audio, credentials, and unrelated personal material are excluded by default.

### 6. Add remote access and tools

Use an identity-aware private network rather than public port forwarding. Require
multi-factor authentication and per-device enrollment. Each tool needs a schema,
allowlist, least-privilege identity, resource limits, dry-run path, idempotency
strategy, explicit approval for consequential actions, and an append-only audit
event. Audit only necessary metadata, redacted identifiers, decisions, and
outcomes—never prompts, secrets, or raw tool payloads. Encrypt and access-control
audit data, and give it bounded retention with privacy-safe deletion or
cryptographic erasure. Provide a manual kill switch independent of the model.

### 7. Add voice, vision, or simulation last

Push-to-talk is the default. A wake word must run locally, have informed consent,
a persistent capture indicator, retention controls, and a hardware or OS mute.
Camera capture follows the same rules. Treat photogrammetry and Omniverse/Isaac
workloads as a separate phase whose current hardware, licensing, and storage
requirements must be verified. Scans are not engineering-grade measurements
unless validated by an appropriate professional workflow.

## Safety Invariants

- No unauthenticated public model, memory, or tool endpoint.
- No blanket administrator, shell, filesystem, microphone, camera, or device
  permission for an agent.
- No credentials in prompts, source control, browser bundles, logs, or indexes.
- No ambient recording or recording retention without informed consent.
- No destructive or external side effect without just-in-time explicit approval.
- No downloads, installs, firewall changes, or service startup disguised as
  harmless discovery.
- No claim to copy proprietary models, code, or another company's private team.

## Deliverable

Return known facts and unknowns, a topology and threat model, the hardware
compatibility matrix, storage layout, phased commands with validation and
rollback, the application API contract, routing and cost policy, memory lifecycle,
remote-access and consent controls, benchmarks, tests, and one reversible next
step. Use `commands/local-ai.md` as the detailed output contract.
