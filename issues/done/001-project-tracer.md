## Parent PRD

`issues/prd.md`

## What to build

A minimal end-to-end tracer that proves every layer wires together: a TypeScript project scaffold (Vite + React frontend, Hono backend, `better-sqlite3` storage), the `SnipStore` deep module, a `GET`/`PUT /api/snips/:slug` round-trip, a `GET /api/health` endpoint, the SQLite schema applied at boot, and a single-page UI at `/s/:name` consisting of a plain `<textarea>` and a manual "Save" button.

This slice does not include slug validation, autosave, the landing page, CodeMirror, the toolbar, theming, the size cap, or Docker packaging — those land in subsequent slices. It exists to lock down the project shape and give every later slice something to attach to.

See **Implementation Decisions → Modules / API contract / Schema / Routing** and **Testing Decisions → SnipStore** in the parent PRD.

## Acceptance criteria

- [ ] `npm install && npm run dev` starts a working dev environment (Hono backend + Vite frontend) with both reachable
- [ ] Schema is applied on boot via `CREATE TABLE IF NOT EXISTS snips (...)` matching the PRD schema (slug PK, content, created_at, updated_at)
- [ ] `GET /api/snips/:slug` returns 200 with `{ slug, content, updatedAt }` if the row exists and 404 `{ error: "not_found" }` otherwise
- [ ] `PUT /api/snips/:slug` with `{ content }` upserts and returns 204; subsequent `GET` returns the saved content
- [ ] `GET /api/health` returns 200 OK
- [ ] `SnipStore` exposes `get(slug)`, `upsert(slug, content)`, and `clearContent(slug)` and hides all SQL/`better-sqlite3` details from callers
- [ ] Visiting `/s/:name` in the browser renders a full-viewport `<textarea>` and a Save button; clicking Save persists, and reloading the page restores the content
- [ ] Vitest is set up and `SnipStore` has integration tests against an in-memory SQLite covering: missing slug returns null; upsert inserts then updates; `created_at` preserved across updates; `updated_at` bumped; round-trip preserves Unicode and 1 MB-sized strings
- [ ] Vitest is set up for Hono routes and integration tests cover: `GET` 404 for missing, `PUT` then `GET` round-trip, `GET /api/health` returns 200

## Blocked by

None — can start immediately.

## User stories addressed

Reference by number from the parent PRD:

- User story 23
- User story 24
- User story 30
- User story 31
- User story 35
- User story 36
