# Snippaste — UI redesign + 404/sync bug fixes

## Context

Two motivations for this change:

1. **Visual redesign.** The landing and editor are being redirected toward a new design language (IBM Plex + blue accent `#6470F0` + rounded corners + scissors brand mark + status pill + bottom status bar) defined in `/Users/ishak/Codebase/design-stuff/Snippaste/Snippaste Landing.html` and `Snippaste Editor.html`. This replaces the current "Telegraph" aesthetic (Fraunces + amber + sharp corners). The saved design-system memory will be updated so future sessions stay aligned.

2. **Two known bugs.**
   - Direct navigation to `/s/<slug>` returns **404** because `src/server/index.ts:12` registers `serveStatic` without an SPA fallback to `index.html`.
   - Two browsers viewing the same snippet **don't sync** — there is no pub/sub or polling; B only sees A's edits after a manual reload.

The intended outcome: ship the new look on both pages, fix the deep-link 404, and add real-time push so a save in one tab is reflected in another within ~1 s — without clobbering the second tab's in-flight typing.

## Decisions (resolved during /discuss)

| Topic | Decision |
|---|---|
| Editor engine | Keep CodeMirror 6, restyle (gutter + theme tokens) |
| Sync transport | SSE (Server-Sent Events) via Hono streaming |
| Pub/sub | In-process `EventEmitter` keyed by slug |
| Conflict policy | Skip incoming update if local editor is dirty (no clobber); show subtle "remote changed" indicator |
| Self-echo | PUT body carries `clientId`; SSE event echoes it back; subscribers ignore their own |
| 404 fix | Hono catch-all serving `dist/client/index.html` for non-`/api` GETs |
| Theme | Manual toggle, persisted in `localStorage` as `snip-theme`, default `dark` |
| Toolbar | Copy URL · Copy · Save · / · Clear · Refresh · Theme — Download removed |
| Confirms & toasts | Adopt both: confirm modal for Clear/Refresh, bottom toast for Copied/Saved |
| Status bar | Add bottom bar with `lines · chars · plain text` |
| Persistence | Server (SQLite) remains the only source of truth; `localStorage` only stores theme |
| Fonts | Replace Fraunces + JetBrains Mono with IBM Plex Sans (400/500/600/700) + IBM Plex Mono (400/500), Google Fonts |
| Tests | Add Vitest coverage for SSE broadcast, self-echo skip, SPA fallback |
| Memory | Update `project_design.md` to the new system |

## Implementation

### 1. Fix the deep-link 404 (server)

**File:** `src/server/index.ts`

Replace the single `app.use("/*", serveStatic(...))` with:
- `serveStatic({ root: "./dist/client" })` for asset requests (existing behavior).
- A trailing catch-all that serves `dist/client/index.html` for any GET that didn't match `/api/*` or a real static file. Use Hono's `c.html(await readFile(..., "utf8"))` or `serveStatic` with `rewriteRequestPath` returning `/index.html`. Cache the file read on boot.

This lets `/s/my-snippet` reach the React shell, where the existing `<Route path="/s/:name">` (`src/client/App.tsx:9`) handles it. No client changes needed.

### 2. Real-time sync via SSE (server + client)

#### 2a. Server pub/sub bus — new file `src/server/snipBus.ts`
- Module-level `Map<slug, Set<(event) => void>>`.
- `subscribe(slug, listener): () => void` — adds listener, returns unsubscribe.
- `publish(slug, { content, updatedAt, clientId })` — fans out to listeners for that slug only.
- No persistence; survives only as long as the process. Listeners removed on disconnect.

#### 2b. SSE endpoint — `src/server/routes.ts`
Add `GET /api/snips/:slug/events`:
- Validate slug; 400 on invalid; 404 if snippet doesn't exist (use `store.get`).
- Use Hono's `streamSSE(c, async (stream) => { … })`.
- Send initial `event: snapshot` carrying current content + updatedAt (so reconnects re-sync).
- Subscribe to `snipBus`; for each publish, write `event: update` with `data: JSON.stringify({ content, updatedAt, clientId })`.
- Heartbeat every 25 s (`stream.writeSSE({ event: "ping", data: "" })`) to defeat proxies.
- Cleanup unsubscribe on `stream.onAbort`.

#### 2c. Broadcast on PUT — `src/server/routes.ts`
After the upsert at `routes.ts:42-44`:
- Read `clientId` from JSON body (optional, string, length-bounded).
- Call `snipBus.publish(slug, { content, updatedAt, clientId })` before returning 204.

#### 2d. PUT body — extend payload
Today the body is `{ content }`. Extend to `{ content, clientId? }`. Ignore unknown fields. Tests for 1 MB cap unaffected.

#### 2e. Client — new file `src/client/clientId.ts`
- `getClientId()` returns a per-tab UUID lazily generated and cached in module state. **Not** persisted to localStorage — we want each tab to have its own ID so multiple tabs in the same browser sync properly.

#### 2f. Client — new file `src/client/snipStream.ts`
- `subscribe(slug, { onUpdate, onSnapshot, onError }): () => void`
- Uses `EventSource("/api/snips/" + slug + "/events")`.
- Parses `update` events; calls `onUpdate({ content, updatedAt, clientId })`.
- Auto-reconnect on `error` with exponential backoff (handled mostly by `EventSource` natively; add a status flag).

#### 2g. Wire into editor — `src/client/SnipPage.tsx`
- Mount: open SSE stream after initial fetch.
- On `update`:
  - If `clientId === ourClientId` → ignore (self-echo).
  - Else if controller state is `dirty` or `saving` → ignore, set a small `remoteChanged` flag (rendered as a subtle "remote update available — refresh" hint near the breadcrumb or status pill).
  - Else → `view.dispatch({ changes: { from: 0, to: doc.length, insert: content } })`. Update internal `lastSavedAt`.
- On unmount: close stream.

#### 2h. Autosave — `src/client/autosaveController.ts`
- Include `clientId` in PUT body.
- No state machine changes.

### 3. Landing page redesign — `src/client/LandingPage.tsx`

Match `Snippaste Landing.html` structurally:
- Two-column layout: brand panel on the left, action panel on the right, vertical divider.
- Left: scissors logo chip + `SNIPPASTE` wordmark, big headline "Share text. **Instantly.**" (blue accent on the second word), description, four pill tags (`Plain text only`, `Instant links`, `No account`, `30-day expiry`).
- Right: "New snip" panel — label, slug input (placeholder `e.g. my-config (optional)`), helper text, primary CTA `Create snip` with arrow icon, divider, three feature rows (zap/copy/shield icons), fine-print footer.
- Theme toggle button in top-right corner.
- Reuse existing `SlugValidator` (`src/shared/slugValidator.ts`) and `SlugGenerator` (`src/client/slugGenerator.ts`) — do **not** introduce a new `slugify`. The current generator already produces what we need.
- Replace inline-styles in the design source with class-based styling in `index.css`.

### 4. Editor page redesign — `src/client/SnipPage.tsx` + new components

Top-level structure: `Toolbar` · CodeMirror with restyled gutter · `StatusBar`.

#### 4a. Toolbar — rewrite `src/client/Toolbar.tsx`
- Left: home link (`<Link to="/">`) with home icon, vertical hairline, snippaste pill (scissors icon + "snippaste"), `/`, slug in IBM Plex Mono with truncation, dirty dot (amber, 6 px) when unsaved.
- Center (absolute-positioned): rounded pill with clock icon + `auto-saved <relative time>` or `saving…` while dirty.
- Right: tool group 1 — Copy URL · Copy · Save (separators between). Tool group 2 — Clear (danger hover red) · Refresh (with confirm). Theme toggle button.
- Drop the Download button — not in the new design.
- New toolbar component composes a small `ToolBtn` and `ToolGroup` (border + rounded + dividers).
- "Saved" state is sourced from `AutosaveController` as today, but the UI uses the new pill styling.

#### 4b. CodeMirror restyle — `src/client/SnipPage.tsx`
- Keep CodeMirror 6 + the autosave wiring at `SnipPage.tsx:82-129`.
- Replace the inline `lightTheme` (lines 19-32) and `oneDark + override` (lines 34-43) with two new theme objects driven by the new tokens.
- Style the `.cm-gutters` and `.cm-lineNumbers` to match the design (52 px wide, muted text color, IBM Plex Mono, 22 px line height).
- Keep extensions `lineNumbers`, `keymap`, etc. as today.

#### 4c. StatusBar — new file `src/client/StatusBar.tsx`
- Bottom 26 px bar: `<n> lines · <n> chars · plain text` (right-aligned).
- Accepts `content: string` as a prop.

#### 4d. ConfirmDialog — new file `src/client/ConfirmDialog.tsx`
- Modal with backdrop, title "Are you sure?", message prop, Cancel + Confirm buttons. Confirm color is destructive red.
- Used by Clear and Refresh.

#### 4e. Toast — new file `src/client/Toast.tsx`
- Single global toast (no queue needed for v1) anchored bottom-center. Auto-hides after ~2.2 s.
- Triggered by Copy URL / Copy / Save (manual). Expose a tiny imperative API or context provider.

#### 4f. Refresh action
- Confirms via `ConfirmDialog`, then refetches `/api/snips/<slug>` and replaces editor content. Clears the `remoteChanged` indicator from step 2g.

#### 4g. Manual Save
- Calls `AutosaveController.flush()` (add this method — bypass debounce, fire immediately if dirty). Toast "Saved" on success.

### 5. Theme & global styles — `src/client/index.css` + `src/client/main.tsx`

- Replace the Google Fonts import line with IBM Plex Sans + IBM Plex Mono.
- Replace the `:root` and `@media (prefers-color-scheme: dark)` token blocks with the new palette (light + dark) sourced from the design files. Drop the `prefers-color-scheme` media query — selection is now driven by a `data-theme="light|dark"` attribute on `<html>`.
- New file `src/client/themeContext.tsx`: provider reads `localStorage["snip-theme"]` (default `"dark"`), writes the attribute on `<html>`, exposes `theme` + `toggle`. Wrap `<App />` in it inside `main.tsx`.
- `index.html`: ensure `<html>` has no hard-coded class; theme provider sets it on first render.

### 6. Memory update

Replace `/Users/ishak/.claude/projects/-Users-ishak-Codebase-snippaste/memory/project_design.md` with the new design language — IBM Plex Sans/Mono, blue accent `#6470F0`, rounded corners (5–12 px), dark navy palette (`#080B12`/`#0D1117`/`#1A2234`) and light palette (`#F0F3F8`/`#FFFFFF`/`#DDE3EE`), scissors brand mark, two-column landing, topbar pill + status pill in editor, bottom status bar. Note that the previous Telegraph aesthetic was retired on 2026-05-01.

### 7. Tests

- `tests/spa-fallback.spec.ts` — boot the Hono app, GET `/s/anything`, assert 200 + HTML containing `<div id="root">`. GET `/api/unknown` still 404.
- `tests/sse.spec.ts` — subscribe to `/api/snips/:slug/events`, fire a PUT from a separate "client", assert the subscriber receives an `update` event with the new content. Second test: PUT carries clientId X; subscriber with clientId X should still **receive** the event (server doesn't filter) — the filter is on the client. Verify event payload echoes clientId.
- Light component test for `AutosaveController.flush()` (manual save) — calling flush while `dirty` triggers a PUT immediately.

## Critical files

| Concern | Path | Action |
|---|---|---|
| 404 SPA fallback | `src/server/index.ts:12` | rewrite static handler |
| SSE endpoint + broadcast on PUT | `src/server/routes.ts` | add GET events route, call publish in PUT |
| Pub/sub bus | `src/server/snipBus.ts` | NEW |
| Existing store (no schema change) | `src/server/store.ts` | no change |
| Per-tab clientId | `src/client/clientId.ts` | NEW |
| SSE subscription helper | `src/client/snipStream.ts` | NEW |
| Autosave PUT body | `src/client/autosaveController.ts` | add `clientId` to body, add `flush()` |
| Editor page (CM restyle + SSE wiring) | `src/client/SnipPage.tsx` | rewrite themes + add stream effect |
| Landing redesign | `src/client/LandingPage.tsx` | rewrite markup |
| Toolbar redesign | `src/client/Toolbar.tsx` | rewrite |
| Status bar | `src/client/StatusBar.tsx` | NEW |
| Confirm dialog | `src/client/ConfirmDialog.tsx` | NEW |
| Toast | `src/client/Toast.tsx` | NEW |
| Theme provider | `src/client/themeContext.tsx` | NEW |
| Global CSS / tokens | `src/client/index.css` | rewrite tokens, drop `prefers-color-scheme` |
| HTML shell | `index.html` | no change |
| Tests | `tests/sse.spec.ts`, `tests/spa-fallback.spec.ts` | NEW |
| Reuse — slug validator | `src/shared/slugValidator.ts` | reuse, no change |
| Reuse — slug generator | `src/client/slugGenerator.ts` | reuse, no change |
| Memory | `~/.claude/projects/-Users-ishak-Codebase-snippaste/memory/project_design.md` | rewrite to new system |

## Verification

1. **Build & run** — `npm run build`, then `node dist/server/server/index.js` (production path) and `npm run dev` (dev path).
2. **404 fix** — open `http://localhost:7777/s/random-thing-123` directly in the browser. Expect: editor renders, snippet starts empty, autosaves persist. Reload — content survives.
3. **Sync** — open the same `/s/<slug>` in two browser windows side by side. Type in window A; within ~1 s window B updates without manual refresh. Type concurrently in B (so B is dirty); A's pushes are deferred — verified by the small "remote changed" hint, and Refresh applies them. Self-echo: A typing should not cause A's editor to flicker.
4. **Toolbar actions** — Copy URL toasts and copies. Copy toasts and copies. Save toasts. Clear opens confirm; on confirm clears. Refresh opens confirm; on confirm reloads from server.
5. **Theme** — toggle persists across reload. First-visit default is dark.
6. **Tests** — `npm test` passes new SSE + SPA-fallback tests alongside existing ones. `npm run typecheck` clean.
7. **Visual parity** — landing matches `Snippaste Landing.html` (two-column, scissors logo, blue CTA, tag pills) and editor matches `Snippaste Editor.html` (topbar with pill + status pill, tool groups, bottom status bar) in both light and dark themes.
