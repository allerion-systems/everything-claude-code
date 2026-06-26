# Test Coverage Analysis

_Generated 2026-06-26. Baseline: `npm test` + `npx c8 --all --include="scripts/**/*.js"`._

## Summary

The suite is large and healthy overall — **1,607 tests** across 67 files exercising the
`scripts/` codebase. Function coverage is excellent; line and branch coverage sit **just
under** the project's own 80% gate (`package.json` → `npm run coverage`).

| Metric      | Coverage | Gate | Status |
|-------------|----------|------|--------|
| Statements  | 79.33% (15337/19332) | 80% | 🔴 below |
| Branches    | 75.23% (2823/3752)   | 80% | 🔴 below |
| Functions   | 91.51% (615/672)     | 80% | 🟢 pass  |
| Lines       | 79.33% (15337/19332) | 80% | 🔴 below |

The headline: lots of code is _reached_ (high function coverage), but **error paths and
conditional branches are under-tested**, and a handful of real scripts have **zero**
coverage. Closing the gap is mostly about edge cases, not net-new test files.

---

## Priority 1 — Failing/fragile tests (fix first)

`npm test` currently reports **3 failures**. Two are not real bugs — they are
**non-hermetic tests that assume a non-root user**:

- `lib/session-aliases.test.js` → "saveAliases triggers inner restoreErr catch when both save and restore fail"
- `lib/session-manager.test.js` → "appendSessionContent returns false when file is read-only (EACCES)"

Both rely on `chmod 0444` to provoke `EACCES`. Under root (CI containers, this
environment) `chmod` is a no-op for the owner, so the write _succeeds_ and the assertion
fails. The third failure is a setup gap:

- `hooks/hooks.test.js` → "observe.sh falls back to legacy output fields when tool_response is null" — `ENOENT … scandir '.../.claude/homunculus/projects'` (a directory the fixture never creates).

**Proposal:** make these tests hermetic. Detect `process.getuid() === 0` and either skip
the permission-based cases with a clear message or simulate the failure by stubbing
`fs.appendFileSync`/`fs.writeFileSync` to throw `EACCES` instead of relying on real file
modes. Create the missing fixture directory in the `observe.sh` test setup. A suite that
fails under root is a latent CI hazard.

---

## Priority 2 — Zero-coverage scripts

These files have **0% coverage** despite containing real, shippable logic (several are in
`package.json`'s published `files` list):

| File | Lines | Why it matters |
|------|-------|----------------|
| `scripts/codex/merge-mcp-config.js` | 304 | TOML merge logic with add-only/`--update-mcp`/`--dry-run` modes — easy to regress, no tests |
| `scripts/ci/catalog.js` | 245 | CI gate that verifies README/AGENTS counts; runs in `npm test` but is itself untested |
| `scripts/status.js` | 176 | User-facing CLI, 29 branches |
| `scripts/skills-health.js` | 132 | Skill health reporting |
| `scripts/orchestrate-worktrees.js` | 108 | Orchestration entry point (its lib is tested, the CLI wrapper is not) |
| `scripts/hooks/desktop-notify.js` | 94 | Stop hook; platform-branching (macOS/Win/Linux) |
| `scripts/ci/validate-no-personal-paths.js` | 63 | Security/privacy gate — should never silently pass |
| `scripts/hooks/session-end-marker.js` | 29 | Session lifecycle hook |

**Proposal:** prioritize `merge-mcp-config.js` and `validate-no-personal-paths.js` first.
The former is complex, stateful, and user-data-mutating; the latter is a privacy guard
whose _failure_ to detect a personal path is a real leak. Both are pure-ish and
script-invocable, so table-driven tests (fixture in → expected stdout/exit code) are cheap.

---

## Priority 3 — Security & hook error paths (low branch coverage)

High function coverage with low branch coverage means the happy path runs but the
**defensive branches don't**. The riskiest cluster is security/hook code:

- `scripts/hooks/insaits-security-wrapper.js` — **42% lines**, and the Python it wraps
  (`scripts/hooks/insaits-security-monitor.py`) has **no test references at all**. A
  security monitor whose failure modes (missing Python, oversized stdin > 1 MB, non-zero
  exit) are untested can fail open silently.
- `scripts/hooks/quality-gate.js` — **54% lines, 50% functions**. The "tooling
  unavailable / unsupported language" fallbacks are exactly the branches not covered.
- `scripts/hooks/mcp-health-check.js` — **51% branches** of 131. Large branch surface,
  half unexercised.
- `scripts/ci/validate-hooks.js` — **27% branches**. A validator that mostly tests its
  own success path won't catch the malformed configs it exists to reject.

**Proposal:** add negative-path tests for the validators and hooks — malformed input,
missing dependencies, oversized payloads, non-zero child exits. For security code,
explicitly assert **fail-closed** behavior.

---

## Priority 4 — Install/session libraries (stateful, error-prone)

These carry real logic and mutate user files, but their failure branches lag:

- `scripts/lib/install-state.js` — 42% lines, 65% branches
- `scripts/lib/install-executor.js` — 44% lines, 65% branches
- `scripts/lib/session-adapters/claude-history.js` — 51% lines
- `scripts/lib/tmux-worktree-orchestrator.js` — 62% lines, 62% branches
- `scripts/lib/state-store/queries.js` — 58% of 81 branches

**Proposal:** focus on rollback/partial-failure paths in `install-executor` /
`install-state` (what happens when an op fails halfway?) and corrupt/legacy-format inputs
in the session adapters and state-store queries.

---

## Recommended sequencing

1. **Make the 3 failing tests hermetic** (skip-or-stub under root, fix the missing
   fixture dir). Gets `npm test` green everywhere.
2. **Cover the two highest-risk zero-coverage scripts** — `merge-mcp-config.js` and
   `validate-no-personal-paths.js`.
3. **Add fail-closed/negative-path tests** for the security & validator cluster
   (Priority 3). This is also where branch % climbs fastest toward the 80% gate.
4. **Backfill error/rollback paths** in the install + session libraries (Priority 4).
5. Wire `npm run coverage` (the existing c8 + 80% threshold script) into CI so the gate is
   enforced, not just available. Consider lowering the branch threshold to a realistic
   floor (e.g. 75%) initially and ratcheting up, so the gate is honest from day one.

## How to reproduce

```bash
npm install
npm test            # 1607 tests; surfaces the 3 failures
npm run coverage    # c8 with the 80% gate (currently fails on statements/branches/lines)
```
