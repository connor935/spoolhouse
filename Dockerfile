# syntax=docker/dockerfile:1

# ---- base -------------------------------------------------------------------
# Debian (glibc) — NOT Alpine (musl): the runner must share a libc with the
# stage that compiles the native better-sqlite3 binding.
# Node 24 to match the version pinned in .node-version (fnm) for local dev.
FROM node:24-bookworm-slim AS base
WORKDIR /app

# ---- deps -------------------------------------------------------------------
# Install ALL deps (incl. dev) and compile native modules (better-sqlite3).
FROM base AS deps
RUN apt-get update && apt-get install -y --no-install-recommends \
      python3 make g++ \
    && rm -rf /var/lib/apt/lists/*
COPY package.json package-lock.json ./
RUN npm ci

# ---- builder ----------------------------------------------------------------
# Build the standalone Next.js output. This stage keeps full deps + source +
# tsx, so it doubles as the image for the "admin" tools service (see compose).
FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

# ---- runner -----------------------------------------------------------------
# Slim runtime: only the standalone server, static assets, and migrations.
FROM base AS runner
ENV NODE_ENV=production \
    PORT=3000 \
    HOSTNAME=0.0.0.0

# Run as the non-root user shipped in the node image. Pre-create the DB dir
# owned by node so a fresh named volume mounted at /data inherits that
# ownership (otherwise Docker creates it root-owned and SQLite can't write).
RUN mkdir -p /data && chown node:node /app /data
USER node

# Standalone server + its traced node_modules (includes better-sqlite3).
COPY --from=builder --chown=node:node /app/.next/standalone ./
# Static assets and public/ are NOT included in standalone output — copy them.
COPY --from=builder --chown=node:node /app/.next/static ./.next/static
COPY --from=builder --chown=node:node /app/public ./public
# Migrations are auto-applied on startup from process.cwd()/drizzle.
COPY --from=builder --chown=node:node /app/drizzle ./drizzle
# Note: better-sqlite3's native binding (node_modules/better-sqlite3/build/
# Release/better_sqlite3.node) is traced into .next/standalone by Next's file
# tracing (verified), so no separate COPY of it is needed.

EXPOSE 3000
CMD ["node", "server.js"]
