## Parent PRD

`issues/prd.md`

## What to build

Add client-side routing (`/` for the landing page, `/s/:name` for the snip page) and build the landing page itself: hero text, name input, "snip" button. Implement the `SlugGenerator` deep module (8-character nanoid) and use it when the user submits an empty name. Run client-side normalization (trim + lowercase) and validation (reusing the same rules as `SlugValidator`) on the input before navigation, with inline error messaging for invalid input.

See **Implementation Decisions → Modules → SlugGenerator**, **Routing**, and **Behavior decisions** in the parent PRD.

## Acceptance criteria

- [ ] Visiting `/` renders the hero "snippaste" headline and the subhead "A tiny place to paste. Pick a name, start typing." followed by the name input and "snip" button
- [ ] Visiting `/s/:name` renders the snip page (the textarea-based editor from issue 001, now reachable through the router)
- [ ] Submitting the form with a non-empty valid name navigates to `/s/<normalized-name>`
- [ ] Submitting the form with an empty name navigates to `/s/<generated>` where `<generated>` is an 8-character nanoid produced by `SlugGenerator`
- [ ] Submitting the form with an invalid name (illegal characters, >64 chars after trimming) shows an inline error and does not navigate
- [ ] Input is auto-normalized (trim + lowercase) before validation/navigation so that `My-Snip ` and `my-snip` resolve to the same destination
- [ ] `SlugGenerator.generate()` returns an 8-character URL-safe nanoid; random source is injectable so a deterministic source can be passed in tests

## Blocked by

- Blocked by `issues/001-project-tracer.md`
- Blocked by `issues/002-slug-validator.md`

## User stories addressed

Reference by number from the parent PRD:

- User story 1
- User story 2
- User story 3
- User story 4
- User story 5 (UI side)
- User story 6 (UI side)
