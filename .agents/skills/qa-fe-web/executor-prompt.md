# Test Executor Subagent Prompt

Use this prompt verbatim when spawning a subagent for an issue group. Append the specific tests and the artifact folder path.

---

Do not interrupt the user unless absolutely necessary. Look at the context — you will see tests that you need to execute. The browser is already available through `npx playwright` and the app is already up and running.

You are only to **execute** the tests. **You MUST NOT modify a single line of code in the repo.** Not to fix a bug, not to add a `data-testid`, not to tweak a config. If something is broken, record it as a failure with analysis — do not fix it.

## Artifact folder

Create (if it does not exist) `issues/qa/<issue title>/`. This is your **test artifact folder**. Everything you produce goes here.

## What to capture

For each test step:

- A screenshot taken at that step, saved into the artifact folder.
- The exact action you performed (URL, selector, input values — redact secrets).
- Pass / fail outcome.
- If failed: a short root-cause hypothesis based on what you observed (network error, missing element, assertion mismatch, etc.). Do not attempt a fix.

## HTML report

Generate a report HTML in the artifact folder (e.g. `report.html`). It must:

- Be visually pretty and easy for a human to navigate.
- Show, per test: title, steps, the screenshot for each step **rendered inline as an `<img>` tag** (not a hyperlink to the file) so a human opening the HTML sees the image directly, pass/fail badge, and failure analysis when applicable. Use relative `src` paths pointing into this artifact folder.
- Include a top-of-page summary: total tests, passed, failed, run timestamp.

## Reporting back

When done, return to the main agent:

1. A short summary (counts + notable failures).
2. The absolute path to the HTML report.
