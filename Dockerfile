# syntax=docker/dockerfile:1

# ── build stage ───────────────────────────────────────────────────────────────
FROM oven/bun:1 AS build

WORKDIR /app

COPY package.json bun.lock* ./
RUN bun install --frozen-lockfile

COPY src/ src/
COPY public/ public/
COPY index.html ./
COPY vite.config.ts ./
COPY tsconfig.json ./

RUN bun run build
RUN bun run build:server

# ── runtime stage ─────────────────────────────────────────────────────────────
FROM oven/bun:1 AS runtime

ENV NODE_ENV=production

WORKDIR /app

RUN groupadd --system --gid 1001 bunjs \
 && useradd  --system --uid 1001 -g bunjs snippaste

RUN mkdir -p /data && chown snippaste:bunjs /data

COPY --from=build --chown=snippaste:bunjs /app/dist/ dist/

ENV PORT=7777
ENV DB_PATH=/data/snippaste.db
ENV FEATURE_QR_CODE=true
ENV FEATURE_LANGUAGE_SWITCHER=true

USER snippaste
EXPOSE 7777

VOLUME ["/data"]

CMD ["bun", "dist/server/index.js"]
