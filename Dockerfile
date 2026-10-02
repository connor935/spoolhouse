# syntax=docker/dockerfile:1

# ---- base -------------------------------------------------------------------
# Debian (glibc) slim. Node 24 to match the version pinned in .node-version
# (fnm) for local dev. No native modules to compile: the DB drivers are pg
# (pure JS) and PGlite (WASM).
FROM node:24-bookworm-slim AS base
WORKDIR /app

# ---- deps -------------------------------------------------------------------
FROM base AS deps
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

# Run as the non-root user shipped in the node image. /data is only used when
# DATABASE_URL is unset (PGlite fallback); pre-create it owned by node so a
# mounted named volume inherits that ownership instead of being root-owned.
RUN mkdir -p /data && chown node:node /app /data
USER node

# Standalone server + its traced node_modules (includes pg and PGlite's WASM).
COPY --from=builder --chown=node:node /app/.next/standalone ./
# Static assets and public/ are NOT included in standalone output — copy them.
COPY --from=builder --chown=node:node /app/.next/static ./.next/static
COPY --from=builder --chown=node:node /app/public ./public
# Migrations are auto-applied on startup from process.cwd()/drizzle.
COPY --from=builder --chown=node:node /app/drizzle ./drizzle

EXPOSE 3000
# Liveness + DB reachability (app/api/health). The slim image has no curl, so
# use node's fetch. start-period covers the migrations run before the server
# starts listening. `docker compose up --wait` in the deploy waits on this.
HEALTHCHECK --interval=30s --timeout=5s --start-period=60s --retries=3 \
  CMD ["node", "-e", "fetch('http://127.0.0.1:'+(process.env.PORT||3000)+'/api/health').then(r=>process.exit(r.ok?0:1),()=>process.exit(1))"]
CMD ["node", "server.js"]
