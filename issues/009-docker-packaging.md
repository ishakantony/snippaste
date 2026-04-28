## Parent PRD

`issues/prd.md`

## What to build

Package the app as a single Docker image suitable for `ishakantony/snippaste`. Multi-stage build: a build stage produces the static frontend bundle and the compiled backend; the runtime stage carries only what's needed to run the Node process. Default port 7777 (overridable via `PORT`), default DB at `/data/snippaste.db`. Add a README that documents both the throwaway and persistent `docker run` invocations and a hint about reverse-proxy setup for `snippaste.ishak.stream`.

See **Implementation Decisions → Stack & ops** and **User Stories** 27–34 in the parent PRD.

## Acceptance criteria

- [ ] A `Dockerfile` at the repo root builds a working image with `docker build -t ishakantony/snippaste .`
- [ ] The runtime image is multi-stage and excludes dev dependencies and source TypeScript from the final layer
- [ ] The container listens on port 7777 by default; setting `PORT=8080` (for example) makes it listen on 8080 instead
- [ ] The container reads/writes its SQLite DB at `/data/snippaste.db`; the path is exposed as a configurable constant or env var
- [ ] `docker run -p 7777:7777 ishakantony/snippaste` starts an ephemeral instance reachable at `http://localhost:7777` where the landing page loads and a snip can be created (data lost on container removal — acceptable for the throwaway flow)
- [ ] `docker run -v snippaste-data:/data -p 7777:7777 ishakantony/snippaste` starts a persistent instance; stopping and re-running the same command preserves snips
- [ ] `docker run -p 7777:7777 ishakantony/snippaste curl -fsS http://localhost:7777/api/health` (or equivalent) returns 200 OK from the running container
- [ ] README documents:
  - The throwaway `docker run` command
  - The persistent `docker run -v ...` command
  - The `PORT` env override
  - A short reverse-proxy hint for hosting at `snippaste.ishak.stream`
  - The build + push commands the maintainer runs locally (no CI)

## Blocked by

- Blocked by `issues/001-project-tracer.md`

## User stories addressed

Reference by number from the parent PRD:

- User story 27
- User story 28
- User story 29
- User story 32
- User story 33
- User story 34
