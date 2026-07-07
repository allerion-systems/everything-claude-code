# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a **Claude Code plugin** - a collection of production-ready agents, skills, hooks, commands, rules, and MCP configurations. The project provides battle-tested workflows for software development using Claude Code.

## Running Tests

```bash
# Run all tests
node tests/run-all.js

# Run individual test files
node tests/lib/utils.test.js
node tests/lib/package-manager.test.js
node tests/hooks/hooks.test.js
```

## Architecture

The project is organized into several core components:

- **agents/** - Specialized subagents for delegation (30+: planner, code-reviewer, tdd-guide, language-specific reviewers/build-resolvers, etc.)
- **skills/** - Workflow definitions and domain knowledge (126+: coding standards, patterns, testing, etc.)
- **commands/** - Slash commands invoked by users (61+: /tdd, /plan, /e2e, etc.)
- **hooks/** - Trigger-based automations defined in `hooks/hooks.json` (SessionStart/SessionEnd, Pre/PostToolUse, PostToolUseFailure, PreCompact, Stop)
- **rules/** - Always-follow guidelines per language (common, cpp, csharp, golang, java, kotlin, perl, php, python, rust, swift, typescript)
- **mcp-configs/** - MCP server configurations for external integrations
- **scripts/** - Cross-platform Node.js utilities for hooks, install/uninstall, and CI validation (`scripts/ci/validate-*.js`)
- **tests/** - Test suite for scripts and utilities
- **contexts/** - Named behavior-mode presets (dev.md, research.md, review.md)
- **examples/** - Sample CLAUDE.md files and statusline config for reference
- **manifests/** + **schemas/** - Install profile/module manifests (`manifests/install-*.json`) and their JSON Schemas, consumed by `scripts/install-*.js`
- **plugins/** - Guide for installing Claude Code plugin marketplaces (docs only, no code)
- **docs/** - Additional guides/architecture notes, including localized READMEs (`docs/<lang>/README.md`)
- **ecc2/** - Experimental Rust TUI dashboard ("ECC 2.0" agentic IDE control plane); a separate Cargo project, not part of the Node.js tooling above

## Key Commands

Representative examples (see `commands/` for the full list of 60+):

- `/tdd` - Test-driven development workflow
- `/plan` - Implementation planning
- `/e2e` - Generate and run E2E tests
- `/code-review` - Quality review
- `/build-fix` - Fix build errors
- `/learn` - Extract patterns from sessions
- `/skill-create` - Generate skills from git history

## Development Notes

- Package manager detection: npm, pnpm, yarn, bun (configurable via `CLAUDE_PACKAGE_MANAGER` env var or project config); see `scripts/lib/package-manager.js`
- Cross-platform: Windows, macOS, Linux support via Node.js scripts
- Agent format: Markdown with YAML frontmatter (name, description, tools, model)
- Skill format: Markdown with clear sections for when to use, how it works, examples
- Skill placement: Curated in skills/; generated/imported under ~/.claude/skills/. See docs/SKILL-PLACEMENT-POLICY.md
- Hook format: JSON with matcher conditions and command/notification hooks
- `npm test` runs the full CI validation chain (validate-agents/commands/rules/skills/hooks/install-manifests, catalog counts, then `tests/run-all.js`); run `npm install` first if `node_modules/` is missing (needed for `ajv`-backed manifest validation and install/uninstall tests)

## Contributing

Follow the formats in CONTRIBUTING.md:
- Agents: Markdown with frontmatter (name, description, tools, model)
- Skills: Clear sections (When to Use, How It Works, Examples)
- Commands: Markdown with description frontmatter
- Hooks: JSON with matcher and hooks array

File naming: lowercase with hyphens (e.g., `python-reviewer.md`, `tdd-workflow.md`)
