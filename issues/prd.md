# snippaste — PRD

## Problem Statement

I want a tiny, self-hostable place to paste plain text and share it via a URL. Existing tools (pastebin, gist, hedgepad) are either ad-heavy, account-walled, feature-bloated, or hard to self-host. I want something so simple I can run it with a single `docker run` and host it at my own subdomain, without configuring a database server, an auth provider, or a CDN. The end-user experience should be: open the page, type a name, press a button, paste — done.

## Solution

**snippaste** is a single-container TypeScript web app, distributed as `ishakantony/snippaste` on Docker Hub and hosted at `snippaste.ishak.stream`.

The user lands on a minimal hero page with a name input and a "snip" button. Clicking the button takes them to `/s/<name>` — a full-screen plain-text editor (CodeMirror 6) that autosaves as they type. Anyone with the URL can read and edit (wiki-style), enabling effortless sharing. Storage is a single SQLite file mounted on a Docker volume; snips live forever unless explicitly cleared.

The app is deliberately small: no accounts, no syntax highlighting, no real-time collaboration, no expiry, no rate limiting beyond a 1 MB per-snip size cap. Just a URL and a textarea-shaped surface that survives page reloads.

## User Stories

1. As a visitor, I want to land on a page that explains what snippaste is in one or two short lines, so that I can immediately understand the tool without reading marketing copy.
2. As a visitor, I want to see a name input and a "snip" button on the landing page, so that I can start a new snip without any onboarding.
3. As a visitor, I want to type a memorable name like `my-notes` and click "snip" to be taken to `/s/my-notes`, so that I get a URL I can recall and share.
4. As a visitor, I want to click "snip" with the name input empty and be taken to a freshly generated URL like `/s/k3p9q8wm`, so that I can paste quickly without thinking of a name.
5. As a visitor, I want invalid name characters or names longer than 64 characters to be rejected with a clear inline message, so that I don't end up at a broken URL.
6. As a visitor, I want my name to be auto-lowercased and trimmed before navigation, so that `My-Snip ` and `my-snip` resolve to the same place.
7. As a user on a snip page, I want a full-screen editor with a thin top bar above it, so that the editor gets nearly the entire viewport.
8. As a user on a snip page, I want the snip name shown on the left of the top bar, so that I always know which snip I'm editing.
9. As a user on a snip page, I want a save status indicator centered in the top bar showing "Saving…", "Saved ✓ HH:MM", or "Offline ⚠", so that I trust my changes are persisted.
10. As a user on a snip page, I want my edits autosaved 800ms after I stop typing, so that I don't have to think about saving.
11. As a user on a snip page, I want a "copy URL" toolbar button that puts the absolute snip URL on my clipboard, so that I can paste it into a chat without selecting the address bar.
12. As a user on a snip page, I want a "copy content" toolbar button that copies the editor's text, so that I can paste it elsewhere without selecting all.
13. As a user on a snip page, I want a "download" toolbar button that saves the content as `<slug>.txt`, so that I can keep a local file copy.
14. As a user on a snip page, I want a "clear" toolbar button that, after confirmation, wipes the snip, so that I can intentionally start over.
15. As a user clearing a snip, I want a confirmation dialog that warns me everyone with the URL will see it as empty, so that I don't accidentally nuke shared content.
16. As a user on a snip page, I want CodeMirror 6 plain-text editing with line numbers and soft-wrap, so that long pasted text is readable.
17. As a user on a snip page, I want my browser's prefers-color-scheme to determine light or dark mode, so that the page matches my system setting without a toggle.
18. As a user, I want to share `https://snippaste.ishak.stream/s/<slug>` and have the recipient land directly in the editor with the current content, so that no extra steps are needed.
19. As a recipient of a shared link, I want to be able to edit the snip without signing in, so that collaboration is frictionless.
20. As a user, I want my content saved even if I never explicitly hit a save button, so that closing the tab doesn't lose work after I've stopped typing for 800ms.
21. As a user with a flaky connection, I want the indicator to show "Offline ⚠" when a save fails and resume saving when the network returns, so that I'm aware of failures.
22. As a user, I want autosave to coalesce in-flight requests so that fast typing produces one save per debounce window, not a queue of stale requests.
23. As a user opening a URL that has never been used, I want an empty editor (not a 404), so that the URL becomes the snip on first save.
24. As a user opening a URL that already has content, I want the existing content to load into the editor on page load, so that I can read or edit it.
25. As a user, I want my edits to overwrite anyone else's edits without warning (last-write-wins), so that the model is predictable and matches a paste tool.
26. As a user pasting a very large file, I want saves over 1 MB rejected with a clear inline error, so that I understand the limit and the snip isn't silently truncated.
27. As an operator, I want to run `docker run -p 7777:7777 ishakantony/snippaste` and have a working ephemeral instance, so that I can try the tool with one command.
28. As an operator, I want to run `docker run -v snippaste-data:/data -p 7777:7777 ishakantony/snippaste` to get a persistent instance, so that data survives container restarts.
29. As an operator, I want to override the listening port via the `PORT` environment variable, so that I can fit the container into existing port schemes.
30. As an operator, I want a `GET /api/health` endpoint that returns 200 OK, so that my reverse proxy and uptime checks have something to hit.
31. As an operator, I want the SQLite schema to be applied automatically on container start via `CREATE TABLE IF NOT EXISTS`, so that I never have to run a migration step.
32. As an operator, I want the README to document both the throwaway and persistent `docker run` invocations, so that I can pick the right one for my use case.
33. As the maintainer, I want to build and push the Docker image manually from my laptop with a documented build command, so that releases are explicit and don't require CI secrets.
34. As the maintainer, I want the Docker image to be reasonably small (single-stage or multi-stage Node base, no dev deps in final layer), so that pulls are fast.
35. As the maintainer, I want the SQLite data path configurable in code via a single constant or env var defaulting to `/data/snippaste.db`, so that I can change it without hunting through files.
36. As a future maintainer, I want a clear separation between persistence (SnipStore), validation (SlugValidator), and the autosave state machine (AutosaveController), so that each piece can be reasoned about and tested in isolation.

## Implementation Decisions

### Modules

- **SnipStore** — owns all SQLite access via `better-sqlite3`. Public surface: `get(slug)`, `upsert(slug, content)`, `clearContent(slug)`. Hides schema, prepared statements, and timestamps. Returns plain DTOs (`{ slug, content, updatedAt }`) or `null`. The rest of the app never sees SQL.
- **SlugValidator** — pure module. `validate(input)` returns `{ ok: true, slug }` or `{ ok: false, reason }`. Enforces `[a-z0-9-]`, length 1–64. Trims and lowercases input as part of normalization.
- **SlugGenerator** — `generate()` returns an 8-character URL-safe nanoid. Random source is injectable for deterministic tests.
- **AutosaveController** (frontend) — framework-agnostic state machine over `Idle → Dirty → Saving → Saved | Offline`. Owns debounce timing (800ms), in-flight request collapsing, and offline retry. Exposes a subscribable state and an `onChange(text)` input. Does not import React or `fetch` directly — both are injected.
- **SnipApiClient** (frontend) — single source of truth for the HTTP shape. `getSnip(slug)`, `putSnip(slug, content)`. Throws typed errors (`NotFound`, `PayloadTooLarge`, `NetworkError`).

### Framework glue (not standalone modules)

- Hono routes: `GET /api/snips/:slug`, `PUT /api/snips/:slug`, `GET /api/health`. Thin handlers calling `SnipStore` + `SlugValidator`.
- Static-file middleware serving the built Vite bundle for `/`, `/s/:name`, and assets.
- Boot script: open SQLite, run `CREATE TABLE IF NOT EXISTS snips (slug TEXT PRIMARY KEY, content TEXT NOT NULL, created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL)`, start Hono.
- React shells: `LandingPage`, `SnipPage`, `Toolbar`, `EditorView`. UI only — all state and effects come from the controllers/clients above.

### API contract

- `GET /api/snips/:slug` → 200 `{ slug, content, updatedAt }` if exists; 404 `{ error: "not_found" }` otherwise. Slug is validated; invalid slug returns 400.
- `PUT /api/snips/:slug` with body `{ content: string }` → 204 on success. 400 for invalid slug. 413 for content >1 MB. Upserts the row; on first non-empty save creates it.
- `GET /api/health` → 200 `OK`.

### Schema

Single table `snips`:
- `slug TEXT PRIMARY KEY`
- `content TEXT NOT NULL`
- `created_at INTEGER NOT NULL` (epoch ms)
- `updated_at INTEGER NOT NULL` (epoch ms)

No migrations framework; schema applied via `CREATE TABLE IF NOT EXISTS` at boot.

### Routing

- `/` — landing page (hero + input + button).
- `/s/:name` — snip page (CodeMirror editor + toolbar).
- `/api/*` — backend routes.
- All other paths fall through to a 404 page.

Routing snips under `/s/` removes the reserved-word problem; no name collisions with system routes are possible.

### Behavior decisions

- Access model: public-edit (wiki-style). No auth.
- Concurrency: last-write-wins. No locks, no version checks, no real-time collaboration.
- Lifecycle: snips live forever; no TTL, no cleanup job.
- First write: a snip is persisted only on its first non-empty save. Visiting an unused URL returns 404 from the API; the client renders an empty editor and creates the row on the first save.
- Empty input on landing → autogenerate an 8-character nanoid and navigate to `/s/<generated>`.
- Clear button → confirmation dialog → wipes the editor and saves an empty string. No row deletion.
- 1 MB content cap enforced server-side; client surfaces the 413 as an inline error.
- Theme follows `prefers-color-scheme`; no toggle.
- Save indicator states: `Saving…`, `Saved ✓ HH:MM`, `Offline ⚠`.
- Autosave: 800ms debounce; failed saves enter `Offline` and retry on the next change or on a timer.

### Stack & ops

- Runtime: Node + Hono + `better-sqlite3`.
- Frontend: React + Vite + CodeMirror 6 (plain-text mode).
- Default port: 7777, overridable via `PORT` env.
- DB path: `/data/snippaste.db` inside the container.
- Distribution: `ishakantony/snippaste` on Docker Hub. Built and pushed manually from a laptop; no CI.
- README documents:
  - Throwaway: `docker run -p 7777:7777 ishakantony/snippaste`
  - Persistent: `docker run -v snippaste-data:/data -p 7777:7777 ishakantony/snippaste`
  - Reverse-proxy hint for `snippaste.ishak.stream`.

## Testing Decisions

A good test verifies external behavior at a stable boundary, not implementation details. Tests should drive the public interface of each deep module, treat private state as opaque, and survive refactors that preserve behavior. Avoid mocks for things we own (use the real `SnipStore` against in-memory SQLite); mock only at process boundaries (network, time).

Modules to be tested:

- **SnipStore** — integration tests against a fresh in-memory SQLite per test. Cases: `get` returns `null` for missing slug; `upsert` inserts a new row with `created_at` and `updated_at`; `upsert` on existing slug updates content and bumps `updated_at` while preserving `created_at`; `clearContent` writes empty string but row remains; round-trip preserves Unicode and very long strings up to 1 MB.
- **SlugValidator** — pure unit tests, table-driven. Cases: valid slugs at length 1, mid-range, and 64; invalid characters (uppercase, spaces, slashes, dots, emoji); lengths 0 and 65; whitespace trimming; uppercase normalization to lowercase.
- **AutosaveController** — unit tests with fake timers and a fake fetch function. Cases: rapid `onChange` calls within 800ms produce a single save; state transitions match the spec (`Idle → Dirty → Saving → Saved`); save failure transitions to `Offline` and a subsequent change retries; an in-flight save followed by another change does not produce two simultaneous requests; `Saved` indicator carries the wall-clock timestamp.
- **Hono route handlers (integration)** — boot the app with an in-memory `SnipStore`, exercise endpoints with `fetch` against the in-process server. Cases: `GET` non-existent slug returns 404; `PUT` then `GET` returns the content; `PUT` with invalid slug returns 400; `PUT` with body >1 MB returns 413; `GET /api/health` returns 200.

`SlugGenerator` and `SnipApiClient` are not tested in the initial cut; their behavior is small and largely exercised through the modules above.

Prior art: none in this repo (greenfield). Use Vitest as the test runner since it integrates cleanly with both the Node backend and the Vite-built frontend.

## Out of Scope

- User accounts, authentication, authorization.
- Read-only viewer URLs distinct from editor URLs.
- Real-time collaborative editing (CRDT / OT / WebSockets).
- Conflict detection or version history.
- Syntax highlighting, language detection, or markdown rendering.
- File uploads (images, attachments, binary).
- Search across snips, listing snips, or any kind of index page.
- Snip expiry, TTL, or scheduled cleanup.
- Rate limiting, IP tracking, abuse dashboards beyond the per-snip 1 MB cap.
- Renaming a snip after creation.
- Analytics, view counters, telemetry.
- Multi-tenancy, workspaces, or teams.
- CI/CD pipelines (image is built and pushed manually).
- Migration framework or schema versioning.
- Configurable DB path beyond the default `/data/snippaste.db`.
- Manual theme toggle (system preference only).
- Mobile-specific UI affordances beyond what a responsive top bar gives for free.

## Further Notes

- The "very simple" constraint is the north star. Any future feature request should be evaluated against whether it preserves the property that the entire app fits in one head.
- Public-edit + last-write-wins is intentional and matches the pastebin spirit. If snips ever start being used as durable shared documents, the access model should be revisited rather than bolting on locks.
- The Docker Hub identity is `ishakantony/snippaste`; the production hostname is `snippaste.ishak.stream`. TLS termination and reverse proxying are assumed to be handled by infrastructure outside this app.
- Empty `docker run` (no `-v`) is allowed and produces an ephemeral demo instance — losing data on restart is acceptable in that mode and called out in the README.
- The schema uses `slug TEXT PRIMARY KEY` rather than a synthetic id because there is exactly one logical key per snip and no need to ever rename or reassign.
