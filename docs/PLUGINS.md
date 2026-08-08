# Recommended Claude Code Plugins

A curated list of plugins that pair well with this repo's agents, skills, and hooks. Origin: the YouTube short [6 Claude Code Plugins Nobody Uses](https://youtube.com/shorts/aAr7eK_06Kk) by @duncanrogoff, plus Hermes which we wire up in `mcp-configs/mcp-servers.json`.

These plugins live outside this repo. Don't vendor them — install them on each developer's machine.

## Quick Reference

| Plugin | Source | Install Surface | One-liner |
|--------|--------|-----------------|-----------|
| ruflo | `ruvnet/ruflo` | npm global | Multi-agent orchestration platform for Claude. |
| gstack | `garrytan/gstack` | `~/.claude/skills/gstack` | Garry Tan's 23-tool Claude Code skill pack with browser CLI. |
| claude-mem | `thedotmack/claude-mem` | `npx` installer + Claude Code marketplace | Persistent memory compression across Claude Code sessions. |
| superpowers | `claude-plugins-official` (Anthropic) | `/plugin install` inside Claude Code | Forces Claude to plan before jumping into code. |
| frontend-design | `claude-plugins-official` (Anthropic) | `/plugin install` inside Claude Code | Production-grade frontends with distinctive design — avoids generic AI aesthetic. |
| code-review | `claude-plugins-official` (Anthropic) | `/plugin install` inside Claude Code | Automated PR review with 5 parallel Sonnet specialist agents. |
| hermes | `NousResearch/hermes-agent` | system installer + MCP server | Already wired in `mcp-configs/mcp-servers.json`. See below. |

## Install Commands

### ruflo

```bash
npm install -g ruflo@latest
cd <project>
ruflo init
ruflo doctor   # verify
```

Source: <https://github.com/ruvnet/ruflo>

### gstack

The author's preferred install is to paste a single instruction block into Claude Code and let it run the clone + setup. The underlying command:

```bash
git clone --single-branch --depth 1 https://github.com/garrytan/gstack.git ~/.claude/skills/gstack
cd ~/.claude/skills/gstack && ./setup
```

Requires Bun v1.0+ and (on Windows) Node.js. After install, `/office-hours`, `/review`, `/qa`, `/ship`, `/browse`, and ~20 more slash commands are available.

Source: <https://github.com/garrytan/gstack>

### claude-mem

Recommended path — registers plugin hooks and the worker service:

```bash
npx claude-mem install
```

Alternative inside Claude Code (if the marketplace is registered):

```text
/plugin install claude-mem
```

Note: `npm install -g claude-mem` only installs the SDK/library — it does not register the plugin hooks or worker. Use the `npx` installer.

Source: <https://github.com/thedotmack/claude-mem>

### Anthropic Official Plugins (superpowers, frontend-design, code-review)

The `claude-plugins-official` marketplace is built into Claude Code — no marketplace registration needed. Inside a Claude Code session, run:

```text
/plugin install superpowers@claude-plugins-official
/plugin install frontend-design@claude-plugins-official
/plugin install code-review@claude-plugins-official
```

These cannot be installed from a non-interactive shell — they require a live Claude Code session.

Source: <https://github.com/anthropics/claude-plugins-official>

### Hermes

Hermes is configured as an MCP server in this repo. Install on the developer machine, then Claude Code picks it up via `mcp-configs/mcp-servers.json`:

```bash
curl -fsSL https://hermes-agent.nousresearch.com/install.sh | bash
hermes setup   # configure API keys / provider
hermes doctor  # verify
```

The MCP entry already exists in `mcp-configs/mcp-servers.json` under the `hermes` key (`hermes mcp serve`). Restart Claude Code after installing the binary.

Source: <https://github.com/NousResearch/hermes-agent>

## Scope and Boundaries

- This repo ships agents, skills, hooks, commands, and rules. It does not bundle external plugins.
- Plugin install state is per-user (`~/.claude/...`, npm globals, system installs). Nothing here should land in the repo tree.
- The Anthropic-managed plugins live in their own marketplace and update independently of this repo.
- When a plugin's slash commands overlap with this repo's (e.g. `code-review` vs `/code-review` in `commands/`), prefer the more specific one for the current task. The repo's command takes precedence when ambiguous.

## Updating This List

Replace this list when conventions materially change. Keep the table and the install snippets in sync — the snippets are the canonical install method, the table is a quick scan.
