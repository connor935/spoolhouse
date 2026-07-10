# syntax=docker/dockerfile:1

# ---- deps: install node_modules (build tools for the better-sqlite3 addon) ----
FROM node:22-bookworm-slim AS deps
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends python3 make g++ ca-certificates \
    && rm -rf /var/lib/apt/lists/*
COPY package.json package-lock.json ./
RUN npm ci

# ---- builder: produce the standalone Next.js server ----
FROM node:22-bookworm-slim AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

# ---- runner: minimal runtime image ----
FROM node:22-bookworm-slim AS runner
WORKDIR /app
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME=0.0.0.0 \
    DATABASE_PATH=/data/spoolhouse.db \
    # The entrypoint migrates once; the app must not race it at runtime.
    SPOOLHOUSE_SKIP_MIGRATE=1
RUN useradd -m app && mkdir -p /data && chown app:app /data

# Standalone server + assets
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
# Migrations + the startup migrate script
COPY --from=builder /app/drizzle ./drizzle
COPY --from=builder /app/scripts/migrate.mjs ./scripts/migrate.mjs
# The migrate script needs these as real packages (Next bundles them into the
# server chunks, so they aren't otherwise present at runtime).
COPY --from=builder /app/node_modules/better-sqlite3 ./node_modules/better-sqlite3
COPY --from=builder /app/node_modules/drizzle-orm ./node_modules/drizzle-orm

USER app
EXPOSE 3000
VOLUME /data
# Migrate once, then start the server.
CMD ["sh", "-c", "node scripts/migrate.mjs && node server.js"]
