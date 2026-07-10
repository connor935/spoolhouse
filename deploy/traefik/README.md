# Traefik reverse proxy

Shared Traefik stack for the Hetzner box. Terminates TLS and routes each
subdomain of `felixkratz.de` to the right app container. Run this **once**; every
app (Spoolhouse and any future one) joins the external `web` network and declares
its own `Host()` router labels — no changes needed here to add an app.

TLS: Let's Encrypt **HTTP-01** — Traefik obtains a separate cert per hostname on
first request. No DNS API token required; ports 80 and 443 must be reachable.

## One-time setup

```sh
# Shared network both stacks attach to
docker network create web

# ACME cert storage (must be a file, mode 600, or Traefik refuses to use it)
touch acme.json && chmod 600 acme.json

# Contact email for Let's Encrypt
echo 'ACME_EMAIL=you@felixkratz.de' > .env

docker compose up -d
```

Check it came up: `docker compose logs -f traefik`.

## Adding an app

In the app's own compose file: attach it to the `web` network (declared
`external: true`) and add labels like:

```yaml
labels:
  - traefik.enable=true
  - traefik.docker.network=web
  - traefik.http.routers.<name>.rule=Host(`<name>.felixkratz.de`)
  - traefik.http.routers.<name>.entrypoints=websecure
  - traefik.http.routers.<name>.tls.certresolver=le
  - traefik.http.services.<name>.loadbalancer.server.port=<container-port>
```

## Notes

- The dashboard is intentionally not exposed. To debug, run
  `docker compose logs -f traefik`.
- Testing certs? Uncomment the `caserver=...staging...` line in the compose
  `command` to use Let's Encrypt staging (avoids the strict rate limit), then
  delete `acme.json` and restart before switching back to production.
