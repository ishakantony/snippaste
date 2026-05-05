# AGENTS.md

AI agent instructions for the Snippaste codebase.

## Project overview

Snippaste is a lightweight, self-hosted snippet/paste tool. React SPA frontend + Hono.js backend, SQLite storage, real-time collaborative editing via SSE.

## Architecture

```
src/
  client/      React SPA (Vite 8 + React Router v7)
  server/      Hono.js API server (Bun runtime)
  shared/      Code shared between client and server (schemas, validators, feature flags)
  tests/       Shared test infrastructure (setup, mocks)
tests/
  e2e/         Playwright E2E tests
```

- **Frontend**: React 19, CodeMirror 6 editor, Tailwind CSS v4
- **Backend**: Hono.js on Bun, `bun:sqlite` + Drizzle ORM for persistence
- **Real-time**: Server-Sent Events (SSE) for live collaborative editing
- **Build**: Vite 8 for client, `bun build --target=bun` for server

## Development commands

```bash
bun install          # Install dependencies
bun run dev          # Start both client (7776) and server (7777)
bun run dev:client   # Start Vite dev server only
bun run dev:server   # Start Hono server only (DB_PATH hardcoded to ./snippaste.db)
bun run test         # Run vitest unit tests
bun run typecheck    # TypeScript type checking (tsc --noEmit)
bun run lint         # Biome lint + format check
bun run lint:fix     # Biome lint + format fix
bun run build        # Build client (dist/client/) and server (dist/server/)
bun run check:all    # lint -> typecheck -> test -> build
bun run db:generate  # Generate Drizzle ORM migrations
bun run test:e2e     # Run Playwright E2E tests (builds first, starts compiled server)
bun run test:e2e:demo # Visible E2E demo with slowed actions
```

## Conventions

### Code style
- **Linter/formatter**: Biome (no ESLint, no Prettier)
- **Styling**: Tailwind CSS v4. Use `cn()` from `@/client/lib/cn.ts` for conditional classes
- **Imports**: Use `@/` path alias (maps to `src/`). e.g. `import { cn } from "@/client/lib/cn"`
- **Extensions**: Omit file extensions in import paths (resolved automatically by `moduleResolution: "bundler"`)

### Commits
- **Conventional Commits** enforced via commitlint (e.g. `feat:`, `fix:`, `chore:`, `docs:`)
- Pre-commit hook runs Biome on staged files
- Pre-push hook runs `typecheck && test && build`

### Testing
- **Unit tests**: Co-located with source code in `src/`, named `<module>.test.ts` (e.g. `src/server/store.test.ts` next to `src/server/store.ts`)
- **Test infrastructure**: Shared setup and mocks in `src/tests/` (e.g. `src/tests/setup.ts`, `src/tests/mocks/`)
- **E2E tests**: Playwright in `tests/e2e/` directory, named `<feature>.spec.ts`
- **Critical**: Vitest mocks `bun:sqlite` with `better-sqlite3` via `src/tests/mocks/bun-sqlite.ts` so server code can run under jsdom
- Use `:memory:` SQLite for test isolation
- All new features must have tests

### API validation
- Zod schemas in `src/shared/schemas.ts` define the API contract
- Server routes use `@hono/zod-validator` middleware for input validation
- Shared schemas are the single source of truth for both client and server types

## File structure conventions

- `src/shared/` — Code used by both client and server. Zod schemas, validators, feature flags
- `src/client/components/ui/` — Reusable UI primitives (Button, Pill, ErrorBoundary)
- `src/client/lib/` — Shared client utilities (cn helper)
- `src/server/` — Server code. Routes, store, bus, env config
- `src/server/db/` — Drizzle ORM schema and database connection
- `src/tests/` — Shared test infrastructure (setup, mocks). Unit tests are co-located with their source modules

## Environment variables

Validated at server startup via `@t3-oss/env-core` + Zod in `src/server/env.ts`:

| Variable | Default | Description |
|---|---|---|
| `PORT` | `7777` | Server listen port |
| `DB_PATH` | `/data/snippaste.db` | SQLite database file path |
| `FEATURE_QR_CODE` | `true` | Enable QR code modal in the editor |
| `FEATURE_LANGUAGE_SWITCHER` | `true` | Enable language switcher in the toolbar |
| `FEATURE_AUTO_SAVE` | `true` | Enable auto-save controls |
| `FEATURE_PASSWORD_PROTECTION` | `true` | Enable password protection UI and management endpoints |
| `SESSION_SECRET` | generated at startup | Secret used to sign unlock cookies. Set this in production so unlock sessions survive server restarts. |

Feature flags are injected into the HTML shell at build time (Vite plugin) and runtime (server `index.ts`) via `FLAGS_PLACEHOLDER`.

## Guardrails

- Never modify the database schema without updating `src/server/db/schema.ts`, running `bun run db:generate`, and updating `src/server/store.ts` and its tests
- Never add a new API route without a corresponding Zod schema in `src/shared/schemas.ts`
- Never use `process.env` directly — always use the validated `env` from `src/server/env.ts`
- Server files use relative imports. Client/test files use `@/` aliases
- Keep `src/shared/` as the canonical location for code used by both client and server
- Never add a feature flag without updating `src/shared/featureFlags.ts` schema, `src/server/env.ts`, and the flag injection in `src/server/index.ts` and the Vite `featureFlagsPlugin`
