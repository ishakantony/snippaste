## Parent PRD

`issues/prd.md`

## What to build

Enforce a 1 MB per-snip size cap server-side: `PUT /api/snips/:slug` rejects bodies whose `content` is greater than 1 MB with a 413 status. The client surfaces this as an inline error in the save-indicator area instead of swallowing it as a generic `Offline ⚠`.

See **Implementation Decisions → API contract** and **Behavior decisions** (1 MB content cap) in the parent PRD.

## Acceptance criteria

- [ ] Server `PUT /api/snips/:slug` returns 413 with a descriptive error body when the request `content` exceeds 1 MB (1,048,576 bytes, measured in UTF-8)
- [ ] No DB write occurs for an oversized payload
- [ ] Hono route integration tests cover: payload at exactly 1 MB succeeds; payload at 1 MB + 1 byte returns 413 with no DB row written
- [ ] The frontend, when receiving 413 from a save, transitions the indicator to a distinguishable error state (e.g. `Too large ⚠`) and stops retrying for that change until the user reduces the content
- [ ] When the user reduces the content below 1 MB, the next change resumes normal autosave and the indicator returns to `Saved ✓`

## Blocked by

- Blocked by `issues/001-project-tracer.md`

## User stories addressed

Reference by number from the parent PRD:

- User story 26
