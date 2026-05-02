# AGENTS.md

AI agent instructions for the Snippaste codebase.

## Project overview

Snippaste is a lightweight, self-hosted snippet/paste tool. React SPA frontend + Hono.js backend, SQLite storage, real-time collaborative editing via SSE.

## Architecture

```
src/
  client/      React SPA (Vite + React Router v6)
  server/      Hono.js API server (Node.js)
  shared/      Code shared between client and server (schemas, validators)
```

- **Frontend**: React 18, CodeMirror 6 editor, Tailwind CSS v4
- **Backend**: Hono.js on Node.js, better-sqlite3 for persistence
- **Real-time**: Server-Sent Events (SSE) for live collaborative editing
- **Build**: Vite 6 for client, tsc for server

## Development commands

```bash
npm install          # Install dependencies
npm run dev          # Start both client (7776) and server (7777)
npm run dev:client   # Start Vite dev server only
npm run dev:server   # Start Hono server only
npm test             # Run vitest unit tests
npm run typecheck    # TypeScript type checking (tsc --noEmit)
npm run lint         # Biome lint + format check
npm run lint:fix     # Biome lint + format fix
npm run build        # Vite production build (outputs to dist/client/)
```

## Conventions

### Code style
- **Linter/formatter**: Biome (no ESLint, no Prettier)
- **Styling**: Tailwind CSS v4. Use `cn()` from `@/client/lib/cn.ts` for conditional classes
- **Imports**: Use `@/` path alias (maps to `src/`). e.g. `import { cn } from "@/client/lib/cn.js"`
- **Extensions**: Import paths must use `.js` extensions (required by ESM)

### Commits
- **Conventional Commits** enforced via commitlint (e.g. `feat:`, `fix:`, `chore:`, `docs:`)
- Pre-commit hook runs Biome on staged files
- Pre-push hook runs typecheck + tests + build

### Testing
- **Unit tests**: Vitest in `tests/` directory, named `<module>.test.ts`
- **E2E tests**: Playwright in `tests/` directory, named `<feature>.spec.ts`
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

## Guardrails

- Never modify the database schema without updating `src/server/store.ts` and its tests
- Never add a new API route without a corresponding Zod schema in `src/shared/schemas.ts`
- Never use `process.env` directly — always use the validated `env` from `src/server/env.ts`
- Server files use relative imports (NodeNext module resolution). Client/test files use `@/` aliases
- Keep `src/shared/` as the canonical location for code used by both client and server
- Never add a feature flag without updating `src/shared/featureFlags.ts` schema, `src/server/env.ts`, and the flag injection in `src/server/index.ts`
