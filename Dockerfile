# syntax=docker/dockerfile:1

# ── Build stage ───────────────────────────────────────────────────────────────
FROM node:20-alpine AS build

WORKDIR /app

# Install all dependencies (including dev) for building
COPY package.json package-lock.json ./
RUN npm ci

# Copy source and config files
COPY src/ src/
COPY public/ public/
COPY index.html ./
COPY vite.config.ts ./
COPY tsconfig.json ./
COPY tsconfig.server.json ./

# Build frontend (Vite → dist/client/)
RUN npm run build

# Compile backend TypeScript (tsc → dist/server/)
RUN npx tsc -p tsconfig.server.json

# Strip dev dependencies
RUN npm prune --omit=dev

# ── Runtime stage ─────────────────────────────────────────────────────────────
FROM node:20-alpine AS runtime

WORKDIR /app

# Create data directory for SQLite
RUN mkdir -p /data

# Copy compiled output and production node_modules
COPY --from=build /app/dist/ dist/
COPY --from=build /app/node_modules/ node_modules/

# Environment defaults
ENV PORT=7777
ENV DB_PATH=/data/snippaste.db

EXPOSE 7777

# Persist SQLite data
VOLUME ["/data"]

CMD ["node", "dist/server/server/index.js"]
