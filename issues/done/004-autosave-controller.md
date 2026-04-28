## Parent PRD

`issues/prd.md`

## What to build

Replace the manual "Save" button on the snip page with debounced autosave driven by the `AutosaveController` deep module. The controller is a framework-agnostic state machine over `Idle → Dirty → Saving → Saved | Offline`, owns the 800ms debounce, collapses in-flight requests, and retries on `Offline`. Render a save-state indicator next to the editor area showing `Saving…`, `Saved ✓ HH:MM`, or `Offline ⚠`.

See **Implementation Decisions → Modules → AutosaveController**, **Behavior decisions** (Save indicator states, autosave timing), and **Testing Decisions → AutosaveController** in the parent PRD.

## Acceptance criteria

- [ ] `AutosaveController` is implemented as a pure controller class/function that takes injected `fetch`-like and `setTimeout`-like dependencies and exposes `onChange(text)` and a subscribable state
- [ ] Controller does not import React, any HTTP library, or `Date.now` directly — all are injected for testability
- [ ] The snip page wires `<textarea>` `onChange` into `AutosaveController.onChange` and renders the indicator from the controller's state
- [ ] Save indicator visibly transitions through `Saving…` → `Saved ✓ HH:MM` on the happy path
- [ ] On a save error or network failure, indicator shows `Offline ⚠`; the next change re-triggers a save attempt; recovery transitions back to `Saved ✓`
- [ ] Rapid `onChange` calls within the 800ms debounce window result in exactly one outgoing save with the latest content
- [ ] An `onChange` while a save is in flight does not start a second concurrent request; the new content is saved after the in-flight request completes
- [ ] Vitest unit tests with fake timers and a fake fetch cover: debounce coalescing, full state-transition sequence on success, transition to `Offline` on failure, retry-on-next-change, no concurrent in-flight saves, indicator carries a wall-clock timestamp on `Saved`

## Blocked by

- Blocked by `issues/001-project-tracer.md`

## User stories addressed

Reference by number from the parent PRD:

- User story 9
- User story 10
- User story 20
- User story 21
- User story 22
