# syntax=docker/dockerfile:1

# ── build stage ───────────────────────────────────────────────────────────────
FROM node:24-slim AS build

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 make g++ \
 && rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json ./
RUN npm ci

COPY src/ src/
COPY public/ public/
COPY index.html ./
COPY vite.config.ts ./
COPY tsconfig.json ./
COPY tsconfig.server.json ./

RUN npm run build
RUN npx tsc -p tsconfig.server.json
RUN npm prune --omit=dev

# ── runtime stage ─────────────────────────────────────────────────────────────
FROM node:24-slim AS runtime

ENV NODE_ENV=production

WORKDIR /app

RUN groupadd --system --gid 1001 nodejs \
 && useradd  --system --uid 1001 -g nodejs snippaste

RUN mkdir -p /data && chown snippaste:nodejs /data

COPY --from=build --chown=snippaste:nodejs /app/dist/ dist/
COPY --from=build --chown=snippaste:nodejs /app/node_modules/ node_modules/

ENV PORT=7777
ENV DB_PATH=/data/snippaste.db
ENV FEATURE_QR_CODE=true
ENV FEATURE_LANGUAGE_SWITCHER=true

USER snippaste
EXPOSE 7777

VOLUME ["/data"]

CMD ["node", "dist/server/server/index.js"]
