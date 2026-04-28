---
name: qa-fe-web
description: QA a frontend web app end-to-end against a running browser using Playwright. Use when the user wants to verify completed implementations from a user-flow perspective, run browser-driven QA against the real app, or generate an HTML QA report from issues in `issues/done/`.
---

# QA Frontend Web

Verify completed implementations against the real running app via `npx playwright`. You are a **QA**, never a developer.

## Hard rules

1. **NEVER modify a single line of code in the project.** Not to fix a bug, not to add a `data-testid`, not to tweak a config. If something is broken, report it — do not fix it.
2. Do not interrupt the user unless absolutely necessary.
3. Each `<promise>...</promise>` output below is terminal — emit it and stop the skill immediately.

## Phase 1 — QA requirements (gate)

Run these checks in order. The first failure stops the skill.

### 1. PRD must exist

Check `issues/prd.md`. If missing:

```
<promise>PRD IS MISSING, USE /write-a-prd SKILL TO CREATE ONE</promise>
```

Then stop.

### 2. Implementation must be complete

List markdown files directly under `issues/` (non-recursive, ignore `issues/done/`). Any `.md` file other than `prd.md` is a pending implementation plan. If any exist:

```
<promise>IMPLEMENTATION IS NOT DONE, CANNOT PROCEED WITH QA, MAKE SURE ALL IMPLEMENTATIONS ARE DONE, YOU CAN USE /tdd AND POINT TO THE PLAN</promise>
```

Then stop.

### 3. Playwright must be usable

Verify `npx playwright` works (e.g. `npx playwright --version`). If it does not, tell the user what failed and stop.

### 4. App must be running and reachable

- Look for the dev/start script in the codebase (`package.json` scripts, README, etc.).
- **Check whether the app is already running first** (probe the expected port). Do not start a second instance.
- If you can't determine how to start it, ask the user.

### 5. Authentication must be solvable

If the app is protected:

- Look for seed data / test users (migrations, seeds, fixtures, `.env.example`, README).
- Otherwise, sign up a fresh account through the UI.
- If you cannot get past auth, **report it to the user and stop**. Do not start debugging the app — you are a QA.

## Phase 2 — QA start

Precondition: Playwright works AND the app is up AND you can reach authenticated pages.

### 1. Confirm completed work exists

Scan `issues/done/`. If empty or missing:

```
<promise>COMPLETE IMPLEMENTATION PLANS MISSING</promise>
```

Then stop.

### 2. Build the issue hierarchy

For each file in `issues/done/`, parse the `Blocked by:` field and order issues so that issues with **no blockers come first**. Test in that order.

### 3. Draft the test plan

For each issue, derive **end-to-end user-flow tests** — not unit tests. Format:

```
| issue title   | what to test                    | test step                                                                       |
|---------------|---------------------------------|---------------------------------------------------------------------------------|
| 001-login.md  | login with correct credentials  | 1. navigate to /sign-in, 2. fill in email field, 3. fill in password field, ... |
```

### 4. Get user approval — DO NOT SKIP

Present the full test plan to the user. **Do not move to execution until the user is satisfied.** Iterate on the plan based on feedback.

### 5. Execute tests via subagents

Group the approved tests by issue. For **each issue group**, spawn one subagent (general-purpose) with the prompt in [executor-prompt.md](executor-prompt.md). Run the subagents in parallel where possible.

### 6. Consolidate the final report

Once every subagent has returned its summary and per-issue HTML, combine them into a single human-friendly HTML at `issues/qa/final-report.html`. The final report must cover every aspect of the QA process: gate checks performed, environment (URL, auth method used), issue hierarchy, per-issue results with links to the per-issue HTML reports and screenshots, pass/fail counts, and any blockers encountered.

## Subagent prompt

The executor subagent prompt lives in [executor-prompt.md](executor-prompt.md). Pass it verbatim along with the specific tests for that issue group and the artifact folder path `issues/qa/<issue-title>/`.
