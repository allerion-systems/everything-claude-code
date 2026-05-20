---
name: hermes-agent
description: Delegate long-running autonomous work, persistent-memory tasks, and multi-platform messaging to Hermes Agent (Nous Research) via its stdio MCP server. Use when a task needs to outlive a Claude Code session, span scheduled cron runs, or reach the user through Telegram/Discord/Slack/WhatsApp/Signal/email.
origin: community
---

# Hermes Agent

Open-source autonomous agent from Nous Research with persistent memory, a learned-skills loop, scheduled (cron) execution, and gateways into Telegram, Discord, Slack, WhatsApp, Signal, and email. Runs locally or on a $5 VPS.

Repository: https://github.com/NousResearch/hermes-agent
Docs: https://hermes-agent.nousresearch.com/

## When to Activate

- A task should keep running after this Claude Code session ends.
- The user wants the agent to remember context across sessions (persistent memory).
- Work needs to be scheduled (e.g., daily/cron-driven automations).
- Outputs need to be delivered through a messaging app (Telegram, Discord, Slack, WhatsApp, Signal, email).
- You want to delegate a subtask to a separate autonomous agent rather than expand the current Claude Code session.

Skip when the task is a short, in-session edit or anything that fits comfortably inside Claude Code's normal workflow.

## Install

```bash
curl -fsSL https://hermes-agent.nousresearch.com/install.sh | bash
```

Inspect the script first if you don't trust the source. The installer:

- Provisions `uv`, Python 3.11, and Node 22 under `$HERMES_HOME` (default `~/.hermes`).
- Clones `github.com/NousResearch/hermes-agent` into `$HERMES_INSTALL_DIR`.
- Creates a `hermes` command on `PATH` (FHS layout for root installs).
- Writes `~/.hermes/config.yaml` and `~/.hermes/.env` (mode 0600).
- Runs `python -m hermes_cli.main setup` for interactive provider/model config (skip with `--skip-setup`).

Run `hermes doctor` after install to verify the environment.

## MCP Wiring

Hermes exposes a stdio MCP server. Add this to the project or user MCP config (the entry is already pre-staged in `mcp-configs/mcp-servers.json`):

```json
{
  "mcpServers": {
    "hermes": {
      "command": "hermes",
      "args": ["mcp", "serve"]
    }
  }
}
```

If `hermes` is not on `PATH`, point at the venv binary instead:

```json
{
  "mcpServers": {
    "hermes": {
      "command": "/home/<user>/.hermes/hermes-agent/venv/bin/hermes",
      "args": ["mcp", "serve"]
    }
  }
}
```

Read operations work standalone. Sending messages through the platform gateways requires `hermes gateway` to be running.

## Common CLI

| Command | Purpose |
|---------|---------|
| `hermes` | Launch the interactive terminal UI |
| `hermes model` | Switch between 200+ supported LLM providers |
| `hermes tools` | Enable/disable agent tools |
| `hermes gateway` | Start the messaging-platform gateway |
| `hermes skills` | Browse and manage learned skills |
| `hermes cron` | Schedule recurring agent runs |
| `hermes mcp serve` | Run as a stdio MCP server (use from Claude Code) |
| `hermes doctor` | Diagnose configuration / environment |

## Notes

- Stdio-only MCP transport today — no HTTP/SSE endpoint exposed by `hermes mcp serve`.
- Hermes also *consumes* external MCP servers; you can compose it with this repo's other MCP entries (e.g. `github`, `filesystem`).
- Skills follow the [agentskills.io](https://agentskills.io) open standard, so skills authored here can be loaded by Hermes with minor adjustments.
- The container that runs Claude Code on the web is ephemeral — install Hermes on a durable machine if you want sessions, memory, and cron jobs to persist.
