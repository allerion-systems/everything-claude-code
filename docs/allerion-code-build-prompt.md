# `_/\_` — Build Prompt for an Enhanced Claude-Code-Style Agent

Paste everything in the fenced block below into a fresh Claude Code session (ideally
in an empty repo). It instructs Claude Code to design and build **`_/\_` (Allerion
Code)** — an original agentic coding CLI with feature parity to a modern coding
assistant, plus enhancements. It's a clean-room build on the public Anthropic API,
so it stays original and trademark-safe.

---

````text
# BUILD BRIEF — "_/\_" (Allerion Code)

You are Claude Code. Build me an original, production-grade agentic coding CLI
called "_/\_" — spoken "Allerion Code", invoked as `ally`. The "_/\_" glyph is the
Allerion wordmark/logo. Match the core capabilities of a modern agentic coding
assistant, then exceed them with the enhancements in section 4.

## 0. GROUND RULES (read first)
- ORIGINAL CODE ONLY. Implement from scratch. Do NOT copy or decompile any
  proprietary source. This is a clean-room build.
- Use the official Anthropic SDK + Messages API (default model: claude-opus-4-8;
  allow claude-sonnet-4-6 and claude-haiku-4-5 as configurable tiers). Read the
  API key from ANTHROPIC_API_KEY.
- Respect Anthropic's Terms of Service and trademarks. The product brand is
  "_/\_" / Allerion — never present it as "Claude" or imply Anthropic endorsement.
- Stack: TypeScript, Node 20+ (ESM), a single npm package exposing an `ally` bin.
- WORKFLOW: First produce a short architecture plan and a milestone list and show
  it to me. Then implement milestone by milestone, writing tests as you go. Use a
  git branch. Commit after each milestone with conventional-commit messages.

## 1. IDENTITY & UX
- CLI command: `ally`. Subcommands: `ally` (interactive REPL), `ally -p "<prompt>"`
  (headless/one-shot), `ally resume`, `ally config`, `ally mcp`.
- On launch, print the "_/\_" wordmark + version + the active model + cwd.
- Clean terminal UI: streamed assistant output as Markdown, tool calls shown as
  collapsible/labeled steps, a persistent status line (model · tokens · cost).
- Color/brand accents: olive (#5a6850) and silver (#9da2a6).

## 2. CORE ARCHITECTURE (the agent loop)
- Provider abstraction: a `ModelProvider` interface; ship an Anthropic provider
  first; leave room for an OpenAI-compatible/local provider later.
- Streaming agent loop: send messages → stream text + tool_use → execute tools →
  feed tool_result back → repeat until done. Handle interleaved thinking if available.
- TOOL REGISTRY (each tool = name, JSON schema, handler, permission level):
  - read_file, write_file, edit_file (exact-string replace), multi_edit
  - list_dir, glob, grep/search (ripgrep-backed)
  - run_bash (with timeout + streaming output)
  - web_fetch / web_search (optional, behind a flag)
  - todo/task tracker tool
- PERMISSION SYSTEM: per-tool risk levels; modes = ask / acceptEdits / allow-listed /
  deny. Persist an allowlist in project + user settings. Never run destructive bash
  without confirmation unless allow-listed.
- CONTEXT & MEMORY: auto-load an `ALLERION.md` (project brief) from repo root + a
  user-level `~/.allerion/ALLERION.md`. Support `@file` mentions to pull files into
  context. Implement context-window management (summarize/compact when near limit).
- SESSION PERSISTENCE: save transcripts as JSONL under `.allerion/sessions/`;
  `ally resume` reattaches the last session with full context.

## 3. PLATFORM FEATURES (parity)
- Slash commands: built-ins (/help, /clear, /model, /cost, /plan, /review, /resume)
  + user-defined commands loaded from `.allerion/commands/*.md`.
- Hooks: run shell hooks on lifecycle events (PreToolUse, PostToolUse, Stop,
  SessionStart) configured in `.allerion/settings.json`. Hook output can block or
  annotate a tool call.
- MCP client: connect to MCP servers (stdio + HTTP) declared in settings; expose
  their tools to the agent with schema-on-demand loading.
- Subagents: a `task` tool that spawns a sub-agent with its own context to handle a
  scoped job and return a result; support running several in parallel.
- Config precedence: CLI flags > project `.allerion/settings.json` > user settings.

## 4. ENHANCEMENTS (make `_/\_` better than the baseline) — implement at least 4
1. BUILT-IN COST & BUDGET METER: live $ spend per session; a `--budget` cap that
   warns/stops when exceeded; per-model cost table.
2. SELF-VERIFYING EDIT LOOP: after any code edit, auto-run the project's test/lint
   command (auto-detected) and let the agent fix failures before yielding — with a
   hard rule never to weaken or delete assertions to make tests pass.
3. "BRAIN" PERSISTENT MEMORY: a local notes store the agent can read/write across
   sessions (decisions, conventions, gotchas), surfaced into context automatically.
4. PARALLEL PLAN-AND-FAN-OUT: a `/swarm` command that decomposes a task and runs N
   subagents concurrently, then merges results.
5. MODEL ROUTER: cheap model (Haiku) for mechanical steps, Opus for hard reasoning,
   chosen automatically per step with an override flag.
6. CHECKPOINTS / UNDO: snapshot the working tree before risky operations; `ally undo`
   restores the last checkpoint.
7. SECURITY GUARDRAILS: a secrets scanner that blocks the agent from printing or
   committing API keys/tokens; a denylist of dangerous commands.

## 5. QUALITY BAR
- Tests for the agent loop, tool handlers, permission logic, and config precedence.
- `--help` for every command; a README with install + quickstart + the `_/\_` brand.
- Graceful errors (network, rate limits with backoff, bad API key).
- `npx ally` should work after `npm install`.

## 6. MILESTONES (build in this order, show me each)
- M0: scaffold package, `ally` bin, config loader, Anthropic provider, basic REPL
  that streams a reply (no tools yet).
- M1: tool registry + read/write/edit/list/grep/bash + permission prompts.
- M2: agent loop closes (tool_use → tool_result), ALLERION.md context, sessions+resume.
- M3: slash commands + hooks + settings precedence.
- M4: MCP client + subagents/task tool.
- M5: enhancements (pick ≥4 from section 4) + tests + README.

Start with M0 now: propose the architecture and milestone plan in a few bullets,
then scaffold the package and get a streaming `ally` REPL talking to the Anthropic
API. Stop after M0 and show me before continuing.
````

---

## Notes & options

- **Scope reality:** a full coding agent is a real project — M0–M2 gets you a working
  agent in a focused session; M3–M5 are follow-on sessions. The prompt is staged so
  Claude Code stops after M0 for your review instead of running for hours.
- **Brand:** the command is `ally` (typeable); `_/\_` is the wordmark you print in the
  banner/README. If you'd rather the binary be literally `allerion`, change the two
  `ally` references.
- **Legal:** framed as an original clean-room build on the public Anthropic API. Keep
  it that way — don't copy proprietary source or use Anthropic/Claude marks in the
  product name, and you're on safe ground (and free to open-source it).
- **Tie-in:** enhancement #3 ("brain" memory) and #2 (self-verifying loop) map
  directly to the workflows you already teach in the YouTube scripts — `_/\_` could
  become a product the channel demos and sells.
