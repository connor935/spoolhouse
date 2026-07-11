# Deploying Spoolhouse

Runs on a single Ubuntu box (Hetzner) with Docker Compose, behind a shared
[Traefik](deploy/traefik/) reverse proxy that terminates TLS and routes
subdomains of `felixkratz.de`. Spoolhouse lives at `spoolhouse.felixkratz.de`.

Architecture: Traefik is one long-lived stack; each app is its own compose stack
that joins Traefik's external `web` network. Adding another app later means
another stack with its own `Host()` label — Traefik picks it up automatically.

## 1. DNS

Point a wildcard record at the server so every subdomain resolves to it:

```
*.felixkratz.de   A   <server-ip>
felixkratz.de     A   <server-ip>   # optional (apex)
```

Let's Encrypt HTTP-01 needs the exact hostname to resolve publicly before the
first request, so make sure DNS has propagated.

## 2. Server prerequisites

```sh
# Docker Engine + Compose plugin (official convenience script)
curl -fsSL https://get.docker.com | sh

# Firewall: SSH + HTTP + HTTPS
ufw allow 22 && ufw allow 80 && ufw allow 443 && ufw enable

# Shared network both stacks attach to
docker network create web
```

## 3. Start Traefik (once)

```sh
# From a copy of deploy/traefik/ on the server (e.g. ~/infra/traefik)
cd ~/infra/traefik
cp .env.example .env && edit .env       # set ACME_EMAIL
touch acme.json && chmod 600 acme.json  # cert storage, must be mode 600
docker compose up -d
```

See [deploy/traefik/README.md](deploy/traefik/README.md) for details.

## 4. Deploy the app

```sh
git clone <repo-url> spoolhouse && cd spoolhouse

# Create .env from the template and fill in the required values
cp .env.example .env
```

Set in `.env` (do **not** set `DATABASE_PATH` — compose points it at the volume):

| Var | Value |
|---|---|
| `BETTER_AUTH_SECRET` | `openssl rand -base64 32` |
| `BETTER_AUTH_URL` | `https://spoolhouse.felixkratz.de` (public HTTPS URL — drives secure cookies/origins) |
| `MINIMUM_PASSWORD_LENGTH` | e.g. `12` |
| `ALLOW_SIGNUP` | leave unset/false; admins create accounts |
| `SMTP_*`, `MAIL_FROM` | optional — without `SMTP_HOST`, reset mails are logged to `docker compose logs` |

Then build and start:

```sh
docker compose up -d --build
```

The app auto-creates `/data`, opens the SQLite DB in WAL mode, and applies
migrations on startup. Traefik requests a cert on the first HTTPS hit.

## 5. Bootstrap the first admin

Registration is closed, so create the first admin account (prints a one-time
password to sign in with, then change it on `/account`):

```sh
docker compose run --rm admin you@felixkratz.de "Your Name"
```

Re-running with an existing email promotes that user to admin instead.

## 6. Verify

- `https://spoolhouse.felixkratz.de/login` loads over a valid certificate.
- `http://spoolhouse.felixkratz.de` redirects to HTTPS.
- Sign in with the bootstrapped admin; add a spool.
- `docker compose restart app` — data survives (it's on the `spoolhouse-data`
  volume) and startup logs show no migration errors.

## Updating

```sh
git pull
docker compose up -d --build
```

Migrations in `drizzle/` apply automatically on the next start.

## Backups

The database is the `spoolhouse-data` volume (`/data`, including the `-wal` and
`-shm` sidecars). Back up the whole directory, e.g.:

```sh
docker compose stop app                     # quiesce writes for a clean copy
docker run --rm -v spoolhouse_spoolhouse-data:/data -v "$PWD":/backup \
  busybox tar czf /backup/spoolhouse-$(date +%F).tar.gz -C /data .
docker compose start app
```

(Volume name is `<project>_spoolhouse-data`; check with `docker volume ls`.)
