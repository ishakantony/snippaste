---
name: tackle-issues
description: Autonomously work through AFK issues from the local issues/ directory in a loop, spawning a subagent per task. Use when user types /tackle-issues or asks to "work the backlog", "burn down issues", "tackle AFK tasks", or run an AFK issue queue. Skips HITL issues. Each task is implemented via TDD in a subagent so the main context stays clean.
---

# Tackle Issues

Loop through AFK issues in `issues/`, picking and completing one task at a time. Each task runs in a subagent.

## Quick start

1. Discover the project's feedback loops (test + typecheck/lint).
2. List `issues/*.md` (skip `issues/done/`), classify HITL vs AFK.
3. **Build the queue once** — order all AFK issues deterministically and materialize them as a TODO list (one todo per issue). Each todo's content MUST be the exact issue filename, including the `.md` extension. This is the source of truth for the rest of the loop.
4. If the queue is empty → output `<promise>NO MORE TASKS</promise>` and stop.
5. Pop the next pending todo, spawn a subagent to complete it.
6. After the subagent returns, update that todo (done / partial / blocked) and loop to step 4.

Do **not** re-classify or re-prioritize the full backlog on every iteration — that is what causes the infinite-thinking-loop bug when several issues are equally workable. Build the queue once; only revisit it when a subagent reports a new issue file appeared.

## 1. Discover feedback loops (once, at start)

Detect the project's test and typecheck/lint commands by inspecting common manifests:

- `package.json` → look at `scripts` (`test`, `typecheck`, `lint`)
- `Makefile` → look for `test`, `check`, `lint` targets
- `pyproject.toml` / `tox.ini` → `pytest`, `mypy`, `ruff`
- `Cargo.toml` → `cargo test`, `cargo clippy`, `cargo check`
- `go.mod` → `go test ./...`, `go vet ./...`
- `composer.json`, `Gemfile`, `mix.exs`, `build.gradle`, `pom.xml` → analogous

If commands are obvious from the manifest, **use them without asking**. If ambiguous (multiple test scripts, unclear lint target, no manifest), ask the user once and remember the answer for the rest of the loop.

Record the discovered commands — pass them into every subagent.

## 2. Read issues

- Read every `issues/*.md` (not recursively — skip `issues/done/`).
- For each, classify HITL vs AFK by reading the file (look for a `Type:` field, an `HITL` tag, or explicit wording).
- Drop HITL issues from the queue.

## 3. Build the queue (once)

Sort all AFK issues into a single deterministic order, then write them to a TODO list using `TaskCreate` — one todo per issue. The todo content MUST be exactly the issue file name, including the `.md` extension, with no prefix, suffix, title, status marker, or extra words.

Examples:

- Issue file `001-add-login.md` → todo content `001-add-login.md`
- Issue file `fix-flaky-tests.md` → todo content `fix-flaky-tests.md`

Do not use todo names like `Tackle 001-add-login.md`, `001-add-login.md: Add login`, or `Add login`. The filename is the stable identifier used to match subagent results back to the queue.

**Sort order** (apply each tier; within a tier, fall through to the next tie-breaker):

1. **Priority tier** (lower wins):
   1. Critical bugfixes
   2. Development infrastructure (tests, types, dev scripts)
   3. Tracer bullets for new features (thin end-to-end slice)
   4. Polish and quick wins
   5. Refactors
2. **Blockers**: any issue whose `Blocked by:` field references something not yet in `issues/done/` is held back — keep it in the list but mark its todo `[blocked: waiting on <X>]` so it is skipped until its blocker is done.
3. **Explicit `Priority:` field** in the issue file (P0 > P1 > P2 …), if present.
4. **Filename order** (alphabetical) — the final, always-decisive tie-breaker. Never spend cycles deciding between two same-tier issues; the filename wins.

Once the TODO list is written, treat it as immutable order. Do not re-sort. The only allowed mutations are:
- marking a todo done / partial / blocked after its subagent returns,
- appending newly-discovered issue files to the **end** of the list,
- unblocking a todo when its blocker moves to `issues/done/`.

## 4. Get recent context

Run `git log --oneline -20` yourself to summarize what's already been shipped. Pass this summary to the subagent so it doesn't repeat completed work.

## 5. Spawn a subagent

Use the `Agent` tool (`subagent_type: general-purpose`) so the main context stays clean. The prompt MUST be self-contained and include:

- The full content of the issue file
- The issue's filename (so the subagent can move it on completion)
- The discovered feedback-loop commands (test + typecheck/lint)
- The recent commits summary
- These instructions:
  - Explore the repo first
  - Implement using the `tdd` skill (red → green → refactor, vertical slices)
  - Before committing, run the feedback loops; fix failures
  - Commit with a message that includes: **key decisions made**, **files changed**, **blockers/notes for next iteration**
  - On success: `git mv issues/<file>.md issues/done/<file>.md`
  - On partial completion: append a `## Progress note (YYYY-MM-DD)` section to the issue file describing what was done and what's left, then commit
  - Report back: which issue, status (done / partial), commit SHA, any blockers

See [SUBAGENT_PROMPT.md](SUBAGENT_PROMPT.md) for a copy-pasteable prompt template.

## 6. Update the TODO and loop

After the subagent returns, update the corresponding todo immediately — do not batch:

- **done** → mark the todo completed.
- **partial** → mark it completed with a `(partial — see progress note)` suffix; the issue file stays in `issues/` and will be picked up again on a future run, but do **not** re-run it in this loop.
- **blocked** → mark it `[blocked: <reason>]` and move on to the next pending todo.
- **hard blocker for the whole loop** (broken test infra the subagent can't fix, missing dep, etc.) → surface to the user and stop.

Then check for new issue files (a subagent may have split a task or filed a follow-up). Append any new ones to the end of the TODO list using the same sort rules — but **do not reorder existing todos**.

Loop to step 4. When all todos are done/blocked, output `<promise>NO MORE TASKS</promise>`. If only blocked todos remain and nothing can unblock them, surface the blocker chain to the user before stopping.

## Rules

- **One task per subagent.** Never bundle.
- **Never touch HITL issues** — leave them for the user.
- **Never `git push`** unless the user explicitly asks.
- **Never skip hooks** (`--no-verify`, etc.).
- If the discovered feedback loops fail and the subagent can't fix them, treat it as a blocker — do not commit broken code to keep the loop moving.
- **Never re-sort the TODO list mid-loop.** Order is decided once at step 3. If you find yourself comparing two same-tier issues to decide which to do "next," stop — the filename tie-breaker already decided. This rule exists to prevent the infinite-thinking-loop failure mode where the model spins re-weighing equally-workable issues every iteration.
