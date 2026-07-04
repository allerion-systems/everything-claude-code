# OpenRouter Setup and Usage Guide

[OpenRouter](https://openrouter.ai) exposes an Anthropic-compatible API endpoint, which means Claude Code can be pointed at it with nothing more than a few environment variables in `settings.json`. This lets you run Claude Code against any model on OpenRouter — including the free-tier models — while keeping all of your ECC agents, skills, commands, and hooks unchanged.

> **Why route Claude Code through OpenRouter?** OpenRouter adds a reliability and management layer between Claude Code and the model provider: unified billing across providers, per-key spend limits, provider fallbacks, and access to hundreds of models (free and paid) behind one API key.

## Prerequisites

- **Claude Code** installed (`claude --version` to verify)
  - macOS / Linux: `curl -fsSL https://claude.ai/install.sh | bash`
  - Windows (PowerShell): `irm https://claude.ai/install.ps1 | iex`
- **Node.js and npm** (`node --version`, `npm --version`)
- An **OpenRouter account** and API key from [openrouter.ai/settings/keys](https://openrouter.ai/settings/keys)

## Quick Start

### 1. Create an OpenRouter API key

1. Sign up / log in at [openrouter.ai](https://openrouter.ai).
2. Go to **Keys → Create Key**, name it, and (optionally) set an expiration.
3. Copy the key immediately — it is shown only once. Never commit it or share it.

### 2. Pick a model

Browse [openrouter.ai/models](https://openrouter.ai/models) and filter by "free". Free models carry a `:free` suffix in their slug, for example:

- `openai/gpt-oss-120b:free`
- `nvidia/nemotron-3-ultra:free`

Copy the slug **exactly** — a typo in the model name is the most common setup failure.

> **Tip:** Claude Code leans heavily on tool calling (file edits, shell commands, subagents). Many free models have weak or no tool-use support and will feel broken inside Claude Code even though they chat fine. Prefer models that rank well in OpenRouter's *Programming* category and advertise tool/function-calling support.

### 3. Configure `settings.json`

Add the following to your Claude Code settings file — either user-level (`~/.claude/settings.json`) or per-project (`.claude/settings.json`):

```json
{
  "env": {
    "ANTHROPIC_BASE_URL": "https://openrouter.ai/api",
    "ANTHROPIC_AUTH_TOKEN": "sk-or-v1-YOUR-KEY-HERE",
    "ANTHROPIC_MODEL": "openai/gpt-oss-120b:free",
    "ANTHROPIC_SMALL_FAST_MODEL": "openai/gpt-oss-120b:free"
  }
}
```

- `ANTHROPIC_BASE_URL` — OpenRouter's Anthropic-compatible endpoint.
- `ANTHROPIC_AUTH_TOKEN` — your OpenRouter API key.
- `ANTHROPIC_MODEL` — the exact OpenRouter model slug to use for main requests.
- `ANTHROPIC_SMALL_FAST_MODEL` — the model used for background/haiku-class tasks; point it at the same (or a cheaper) slug.

Prefer keeping the key out of the file? Put only the base URL and model in `settings.json` and export the key from your shell profile instead:

```bash
export ANTHROPIC_AUTH_TOKEN="sk-or-v1-YOUR-KEY-HERE"
```

### 4. Run Claude Code

```bash
claude
```

Trust the workspace when prompted. Claude Code now talks to the OpenRouter model you configured. To switch models, edit `ANTHROPIC_MODEL` in `settings.json` and restart Claude Code — everything else stays the same.

## Free-Tier Rate Limits

OpenRouter's free models are rate limited per account:

| Account state | Free-model limit |
|---------------|------------------|
| Less than $10 in purchased credits | 50 requests/day, 20 requests/minute |
| $10 or more in purchased credits | 1,000 requests/day on `:free` models |

A one-time $10 credit purchase — even if you never spend it on paid models — raises the free-model daily cap from 50 to 1,000 requests, which is the practical way to use free models for real coding sessions.

> **Don't rotate keys across multiple accounts.** Creating several accounts to multiply the free quota violates OpenRouter's terms of service and risks all of the accounts being banned. If 50 requests/day isn't enough, buy the $10 credit or use a paid model.

## Caveats

- **Agentic quality varies widely.** ECC's workflows (subagents, hooks, multi-step commands) assume a model with strong instruction-following and tool use. Free models will complete simple prompts but frequently fail on complex agentic tasks. Test with your actual workflow before committing to a model.
- **Latency.** Free-tier models are served on shared capacity; response times of several seconds to much longer are normal, and they slow down further under load.
- **Privacy.** Some free models are free *because* prompts may be used for training. Check the model's data policy on its OpenRouter page, and review your OpenRouter privacy settings before sending anything sensitive.
- **Model availability churns.** Free slugs appear and disappear. If Claude Code suddenly errors with a model-not-found response, re-check the slug on [openrouter.ai/models](https://openrouter.ai/models).

## Troubleshooting

| Symptom | Likely cause | Fix |
|---------|--------------|-----|
| `401 Unauthorized` | Wrong/expired key, or key pasted with whitespace | Regenerate the key; check expiration you set at creation |
| Model-not-found error | Slug typo or model was delisted | Copy the slug exactly from the model page, including `:free` |
| `429 Too Many Requests` | Free-tier daily or per-minute limit hit | Wait for the reset, or purchase $10 in credits for the 1,000/day tier |
| Responses hang or time out | Free model under heavy load | Retry, or switch to a faster free model |
| Tool calls fail or loop | Model lacks reliable tool-use support | Pick a model with function-calling support and strong programming rank |

## Reverting to Anthropic

Remove the four `env` entries from `settings.json` (or the exported `ANTHROPIC_AUTH_TOKEN`) and restart Claude Code. It falls back to your normal Anthropic authentication.
