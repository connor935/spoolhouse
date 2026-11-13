<p align="center">
  <img src="public/icon.svg" alt="" width="96" height="96">
</p>

<h1 align="center">Spoolhouse</h1>

<p align="center">A self-hosted inventory for 3D-printer filament spools.</p>

---

Instead of logging every print, you re-weigh a spool on a scale now and then. Spoolhouse subtracts the
empty-spool weight and tells you how much filament is left, how fast you're using it, and when you'll run out.

## Features

- **Inventory by material.** Spools are grouped under shared catalog materials
  ("Prusament — Galaxy Black, PLA"). Shows fill meters plus low and empty states, and filters you can share
  as links.
- **Re-weigh in seconds.** Click a spool, type the scale reading, done. Every weighing is kept, and a
  mistyped one can be undone.
- **Usage stats and forecasts.** Monthly usage, stock value, cost per gram, and a runway forecast per
  material.
- **Shared catalogs.** Materials and spool types (with their empty weights) are global and admin-curated,
  with a request → review flow. A request is usable by its submitter right away. Catalogs can be seeded
  from [SpoolmanDB](https://github.com/Icezaza2543/SpoolmanDB-Community).
- **Material datasheets.** Wiki-style property values (density, temperatures, …), verified by admins.
- **Groups and lending.** Pool selected spools with friends, request to borrow, approve, return.
- **REST API** with bearer tokens, an OpenAPI spec and Swagger UI. Use it to hook up a smart scale, for
  example one that weighs NFC-tagged spools.
- **Drying reminders**, plus spool price, purchase date and storage location.
- Light and dark mode, a mobile layout, keyboard shortcuts, and WCAG 2.2 AA checks in CI.

## Self-hosting

Spoolhouse ships as a container image and needs PostgreSQL. A minimal `docker-compose.yml`:

```yaml
x-env: &env
  DATABASE_URL: postgres://spoolhouse:change-me@db:5432/spoolhouse
  BETTER_AUTH_SECRET: replace-with-output-of-openssl-rand-base64-32
  BETTER_AUTH_URL: http://localhost:3000 # the URL you open Spoolhouse at

services:
  db:
    image: postgres:17
    environment:
      POSTGRES_USER: spoolhouse
      POSTGRES_PASSWORD: change-me
      POSTGRES_DB: spoolhouse
    volumes:
      - db:/var/lib/postgresql/data

  app:
    image: ghcr.io/connor935/spoolhouse:2
    depends_on: [db]
    ports:
      - '3000:3000'
    environment: *env

  # CLI tasks (admin bootstrap, catalog import), run on demand.
  tools:
    image: ghcr.io/connor935/spoolhouse-tools:2
    profiles: [tools]
    depends_on: [db]
    environment: *env

volumes:
  db:
```

```sh
docker compose up -d
# Sign-up is closed by default, so create the first admin:
docker compose run --rm tools npm run admin:create -- you@example.com "Your Name"
```

Database migrations run automatically when the app starts. Admins can create further accounts on
`/admin/users` and import catalog data on `/admin/import`.

### Configuration

| Variable                                                           | Default                                        | Purpose                                                                   |
| ------------------------------------------------------------------ | ---------------------------------------------- | ------------------------------------------------------------------------- |
| `DATABASE_URL`                                                     | —                                              | PostgreSQL 13+ connection string (uses the bundled `pg_trgm` extension)   |
| `BETTER_AUTH_SECRET`                                               | —                                              | Session signing secret, e.g. `openssl rand -base64 32`                    |
| `BETTER_AUTH_URL`                                                  | —                                              | Public URL of the app                                                     |
| `TRUSTED_ORIGINS`                                                  | —                                              | Extra comma-separated origins the app is reached at (LAN IP, …)           |
| `ALLOW_SIGNUP`                                                     | `false`                                        | `true` opens public registration                                          |
| `MINIMUM_PASSWORD_LENGTH`                                          | `12`                                           | Minimum password length                                                   |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `MAIL_FROM`    | port `587`                                     | Password-reset mail. Without `SMTP_HOST`, mails are logged to the console |
| `DATABASE_PASSWORD_FILE`                                           | —                                              | Alternative to `DATABASE_URL` for Docker secrets                          |
| `DATABASE_HOST`, `DATABASE_PORT`, `DATABASE_USER`, `DATABASE_NAME` | `postgres`, `5432`, `spoolhouse`, `spoolhouse` | Used together with `DATABASE_PASSWORD_FILE`                               |

Image tags: `:2` follows the latest 2.x release, `:2.0.0` pins one, and `:latest` follows `main`.

## REST API

Create a token under **Account → API tokens**, then:

```sh
curl -H "Authorization: Bearer sph_…" https://spoolhouse.example.com/api/v1/spools
```

Endpoints are documented in [`docs/api.md`](docs/api.md). A running instance also serves Swagger UI at
`/api-docs` and the spec at `/api/v1/openapi.json`.

## Development

```sh
cp .env.example .env   # then set BETTER_AUTH_SECRET
npm install            # also installs the git hooks
npm run dev            # http://localhost:3000, starts a local Postgres (PGlite), no setup needed
npm run admin:create -- you@example.com "Your Name"
npm run db:seed        # optional: demo users, catalog and a year of weighings
```

Built with Next.js, React, TypeScript, Tailwind CSS, Drizzle ORM and better-auth. Unit and component tests
use Vitest, end-to-end and accessibility tests use Playwright, and components are developed in Storybook.
See [`docs/CONTRIBUTING.md`](docs/CONTRIBUTING.md) for scripts, git hooks and the PR checklist.

## License

[PolyForm Noncommercial 1.0.0](LICENSE). Free for personal use and for noncommercial and public
organizations (charities, schools, research, government). Commercial use is not permitted.
