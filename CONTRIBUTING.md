# Contributing to Snippaste

## Quick start

```bash
npm install
npm run dev
```

This starts both the Vite dev server (port 5173) and the Hono API server (port 7777).

## Development workflow

1. Create a branch from `main`
2. Make your changes
3. Ensure tests pass: `npm test`
4. Ensure types check: `npm run typecheck`
5. Ensure linting passes: `npm run lint`
6. Commit with a conventional commit message (enforced by commitlint)
7. Push and open a pull request

## Commit messages

This project uses [Conventional Commits](https://www.conventionalcommits.org/), enforced via commitlint:

```
feat: add dark mode toggle
fix: resolve SSE reconnection issue
chore: update dependencies
docs: update API documentation
```

## Code style

- **Linter/formatter**: [Biome](https://biomejs.dev/) — no ESLint or Prettier
- **Styling**: Tailwind CSS v4
- **Imports**: Use `@/` path alias (maps to `src/`)
- **Import extensions**: Always use `.js` extensions in import paths (ESM requirement)

Run `npm run lint:fix` to auto-fix lint and formatting issues.

## Testing

```bash
npm test             # Run all unit tests (Vitest)
npm run typecheck    # TypeScript type checking
```

- **Unit tests**: Vitest, located in `tests/*.test.ts`
- **E2E tests**: Playwright, located in `tests/*.spec.ts`
- Use `:memory:` SQLite for test isolation
- All new features must include tests

## Architecture

```
src/
  client/    React SPA (Vite + React Router v6)
  server/    Hono.js API server (Node.js)
  shared/    Shared schemas and validators (Zod)
```

- API routes use Zod schemas (`src/shared/schemas.ts`) for input validation
- Environment variables are validated at startup via `src/server/env.ts`
- Server files use relative imports (NodeNext). Client/test files use `@/` aliases

## PR checklist

- [ ] Tests pass (`npm test`)
- [ ] Types check (`npm run typecheck`)
- [ ] Lint passes (`npm run lint`)
- [ ] New features have tests
- [ ] New API routes have Zod schemas in `src/shared/schemas.ts`
- [ ] Conventional commit messages used
