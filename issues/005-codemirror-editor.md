## Parent PRD

`issues/prd.md`

## What to build

Replace the plain `<textarea>` on the snip page with a CodeMirror 6 editor configured for plain-text editing (no syntax highlighting, line numbers visible, soft-wrap enabled). Wire CodeMirror's content-change events into the existing `AutosaveController` so the autosave behavior is preserved. Editor fills the viewport.

See **Implementation Decisions → Framework glue → React shells** and **Behavior decisions** (CodeMirror plain-text mode) in the parent PRD.

## Acceptance criteria

- [ ] `<textarea>` is removed from the snip page and replaced by a CodeMirror 6 editor instance
- [ ] CodeMirror is configured for plain text only — no language mode, no syntax highlighting
- [ ] Line numbers are visible
- [ ] Soft-wrap is enabled so long lines wrap visually
- [ ] CodeMirror's change events flow into `AutosaveController.onChange` such that all autosave behavior (debounce, state transitions, indicator) is unchanged from issue 004
- [ ] The editor visibly fills the available viewport area (i.e. the area below whatever chrome currently exists; final toolbar layout arrives in issue 006)
- [ ] Manual smoke check: typing into the editor produces the same `Saving… → Saved ✓` indicator behavior as the textarea version

## Blocked by

- Blocked by `issues/004-autosave-controller.md`

## User stories addressed

Reference by number from the parent PRD:

- User story 16
