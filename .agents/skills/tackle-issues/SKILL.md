---
name: tackle-issues
description: Autonomously work through AFK issues from the local issues/ directory in a loop, spawning a subagent per task. Use when user types /tackle-issues or asks to "work the backlog", "burn down issues", "tackle AFK tasks", or run an AFK issue queue. Skips HITL issues. Each task is implemented via TDD in a subagent so the main context stays clean.
---

# Tackle Issues

Loop through AFK issues in `issues/`, picking and completing one task at a time. Each task runs in a subagent.

## Quick start

1. Discover the project's feedback loops (test + typecheck/lint).
2. List `issues/*.md` (skip `issues/done/`), classify HITL vs AFK.
3. If no AFK tasks remain → output `<promise>NO MORE TASKS</promise>` and stop.
4. Pick the next AFK task by priority.
5. Spawn a subagent to complete it.
6. After the subagent finishes, loop back to step 2.

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

## 3. Pick the next task

Prioritize in this order:

1. Critical bugfixes
2. Development infrastructure (tests, types, dev scripts)
3. Tracer bullets for new features (thin end-to-end slice)
4. Polish and quick wins
5. Refactors

Respect any `Blocked by:` field — never pick a task whose blockers aren't in `issues/done/`.

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

## 6. Loop

After the subagent returns:

- If it reported success or partial progress, loop back to step 2.
- If it reported a hard blocker (e.g. failing tests it can't fix, missing dep), surface it to the user and stop.
- When step 2 finds no AFK issues, output `<promise>NO MORE TASKS</promise>`.

## Rules

- **One task per subagent.** Never bundle.
- **Never touch HITL issues** — leave them for the user.
- **Never `git push`** unless the user explicitly asks.
- **Never skip hooks** (`--no-verify`, etc.).
- If the discovered feedback loops fail and the subagent can't fix them, treat it as a blocker — do not commit broken code to keep the loop moving.
