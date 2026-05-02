# Snippaste

A lightweight, self-hosted snippet/paste tool. Create and share code snippets with real-time collaborative editing via Server-Sent Events.

Snippets are stored in SQLite and accessed by short slug (e.g. `http://localhost:7777/my-snippet`).

## Quick start

```sh
npm install
npm run dev
```

- **Frontend**: http://localhost:7776 (Vite dev server)
- **API**: http://localhost:7777 (Hono server, proxied through Vite in dev)

## Tech stack

| Layer | Technology |
|---|---|
| Frontend | React 18, CodeMirror 6, Tailwind CSS v4 |
| Backend | Hono.js on Node.js |
| Database | SQLite (better-sqlite3) |
| Real-time | Server-Sent Events (SSE) |
| Build | Vite 6 (client), tsc (server) |
| Validation | Zod schemas (shared between client/server) |

## Architecture

```
src/
  client/    React SPA — components, editor, themes, SSE client
  server/    Hono.js API — routes, store, pub/sub bus, env config
  shared/    Shared Zod schemas and validators
```

- `src/shared/schemas.ts` defines the API contract (slug validation, request bodies)
- `src/server/env.ts` validates environment variables at startup
- Server uses relative imports (NodeNext). Client/tests use `@/` path aliases

## Commands

```sh
npm run dev          # Start client + server concurrently
npm run dev:client   # Vite dev server only (port 7776)
npm run dev:server   # Hono server only (port 7777)
npm test             # Run Vitest unit tests
npm run typecheck    # TypeScript type checking
npm run lint         # Biome lint + format check
npm run lint:fix     # Auto-fix lint and formatting issues
npm run build        # Production build (outputs to dist/client/)
```

## Local E2E tests

Install the Chromium browser once before running Playwright locally:

```sh
npx playwright install chromium
```

Run the browser E2E suite headlessly:

```sh
npm run test:e2e
```

Run the visible management demo with slowed browser actions:

```sh
npm run test:e2e:demo
```

E2E tests build the client and server, start the compiled Hono server on a test port, and use a disposable SQLite database under `test-results/e2e/`. They are intentionally local-only and are not part of `npm test`, hooks, or CI/CD.

## Environment variables

| Variable | Default | Description |
|---|---|---|
| `PORT` | `7777` | Server listen port |
| `DB_PATH` | `/data/snippaste.db` | SQLite database path |
| `FEATURE_QR_CODE` | `true` | Enable QR code modal in the editor |
| `FEATURE_LANGUAGE_SWITCHER` | `true` | Enable language switcher in the toolbar |
| `FEATURE_AUTO_SAVE` | `true` | Enable auto-save controls |
| `FEATURE_PASSWORD_PROTECTION` | `true` | Enable password protection UI and management endpoints |
| `SESSION_SECRET` | generated at startup | Secret used to sign unlock cookies. Set this in production so unlock sessions survive server restarts. |

## API routes

| Method | Path | Description |
|---|---|---|
| GET | `/api/health` | Health check |
| GET | `/api/snips/:slug` | Get snippet |
| PUT | `/api/snips/:slug` | Create/update snippet (max 1 MB) |
| GET | `/api/snips/:slug/events` | SSE stream for real-time updates |
| POST | `/api/snips/:slug/unlock` | Unlock a protected snippet |
| POST | `/api/snips/:slug/lock` | Clear current browser unlock session |
| PUT | `/api/snips/:slug/password` | Set or change snippet password |
| DELETE | `/api/snips/:slug/password` | Remove snippet password |

---

## Docker deployment

### Throwaway instance

```sh
docker run -p 7777:7777 ishakantony/snippaste
```

### Persistent instance

```sh
docker run -v snippaste-data:/data -p 7777:7777 ishakantony/snippaste
```

SQLite is stored at `/data/snippaste.db` inside the container.

### Custom port

```sh
docker run -e PORT=8080 -p 8080:8080 ishakantony/snippaste
```

### Custom DB path

```sh
docker run -v /host/path:/mydata -e DB_PATH=/mydata/snippaste.db -p 7777:7777 ishakantony/snippaste
```

## Reverse proxy

### Caddy

```caddyfile
snippaste.example.com {
    reverse_proxy localhost:7777
}
```

### nginx

```nginx
server {
    listen 80;
    server_name snippaste.example.com;

    location / {
        proxy_pass http://localhost:7777;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

## Build and publish (maintainer)

```sh
docker build -t ishakantony/snippaste .
docker push ishakantony/snippaste
```
