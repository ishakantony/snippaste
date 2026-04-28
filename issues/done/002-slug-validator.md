## Parent PRD

`issues/prd.md`

## What to build

Introduce the `SlugValidator` deep module and use it server-side so that `GET`/`PUT /api/snips/:slug` reject invalid slugs with a 400. The validator is a pure function that normalizes (trims, lowercases) and validates against `[a-z0-9-]` with length 1–64.

See **Implementation Decisions → Modules → SlugValidator** and **Testing Decisions → SlugValidator** in the parent PRD.

## Acceptance criteria

- [ ] `SlugValidator.validate(input)` returns `{ ok: true, slug }` for valid inputs (post-normalization) and `{ ok: false, reason }` for invalid ones
- [ ] Validator is pure — no I/O, no globals, deterministic
- [ ] Server route handlers run every `:slug` parameter through `SlugValidator` and return 400 with a descriptive error body for invalid slugs
- [ ] Vitest table-driven unit tests cover: valid slugs at length 1, mid-range, and 64; invalid characters (uppercase letters, spaces, slashes, dots, emoji); lengths 0 and 65; whitespace trimming yielding a valid slug; uppercase input normalized to lowercase
- [ ] Hono route integration tests cover: `GET /api/snips/INVALID%20SLUG` returns 400; `PUT` with an invalid slug returns 400 and does not write to the DB

## Blocked by

- Blocked by `issues/001-project-tracer.md`

## User stories addressed

Reference by number from the parent PRD:

- User story 5 (server side)
- User story 6 (server side)
