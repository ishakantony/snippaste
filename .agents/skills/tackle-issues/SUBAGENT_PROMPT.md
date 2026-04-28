# Subagent prompt template

Use this template when spawning the per-task subagent via the `Agent` tool. Fill in the `{{...}}` placeholders. Pass `subagent_type: general-purpose`.

```
You are working a single AFK issue end-to-end. Stay focused on this one task.

## The issue

File: `{{issue_path}}` (e.g. issues/003-add-rate-limit.md)

```
{{full issue file content, verbatim}}
```

## Recent commits (for context — don't repeat work already shipped)

```
{{output of `git log --oneline -20`}}
```

## Project feedback loops (run these before committing)

- Tests: `{{test_command}}`
- Typecheck/lint: `{{typecheck_command}}` (omit if the project has no equivalent)

If either fails, fix the failure before committing. If you can't fix it, stop and report it as a blocker.

## How to implement

1. Explore the repo enough to understand the area you're changing.
2. Use the `tdd` skill: red → green → refactor in vertical slices. One test → one implementation → repeat. No horizontal slicing (do not write all tests first).
3. Build a tracer bullet first if this is a new feature — a thin slice through every layer.
4. Run the feedback loops above. Fix anything they catch.

## Commit

Make ONE commit when the task is complete (or when you've made meaningful partial progress and need to stop).

Commit message format:

```
<type>(<scope>): <subject>

Decisions:
- <key decision 1>
- <key decision 2>

Files changed:
- <path 1>
- <path 2>

Notes for next iteration:
- <blocker or follow-up, if any>
```

Use Conventional Commit types (feat, fix, refactor, test, chore, docs).

## Closing the issue

- If the acceptance criteria are met: `git mv {{issue_path}} issues/done/<same-filename>` and include that in the same commit.
- If you stopped partway: append a `## Progress note (YYYY-MM-DD)` section to `{{issue_path}}` describing what's done and what's left, and commit it (do NOT move it to done/).

## Report back

When you finish, return a short report:
- Issue: `{{issue_path}}`
- Status: done | partial | blocked
- Commit SHA: <sha>
- Blockers / follow-ups: <bullets, or "none">

## Rules

- Never `git push`.
- Never use `--no-verify` or skip hooks.
- Never touch other issue files.
- Don't bundle multiple issues into one commit.
```
