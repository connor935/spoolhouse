# Contributing to Spoolhouse

How to set up a working copy, what runs when you commit and push, and what a pull request
needs. The architecture and domain rules are in [`CLAUDE.md`](../CLAUDE.md). The REST API is
documented in [`api.md`](api.md).

## Setup

**Prerequisites:**

- Node **26** (the exact version is in `.node-version`, which fnm and nvm pick up)
- npm
- git

```sh
git clone https://github.com/connor935/spoolhouse.git
cd spoolhouse
npm install                      # also installs the git hooks (see below), mandatory
cp .env.example .env             # set BETTER_AUTH_SECRET; BETTER_AUTH_URL=http://localhost:3000
npm run dev                      # app on :3000, starts a local PGlite database (data/pglite)
npm run admin:create -- you@example.org "Your Name"   # first admin account
```

You don't need a Postgres server for local development. Leave `DATABASE_URL` unset and
`npm run dev` starts an embedded PGlite database for you.

**Check that the hooks are installed.** This step is mandatory:

```sh
git config core.hooksPath        # must print: .husky/_
```

If it prints nothing, run `npm run prepare`. Do this in every new clone and every new
`git worktree`.

For the end-to-end tests, install the browser once:

```sh
npx playwright install chromium
```

## Git hooks

The hooks are managed by [husky](https://typicode.github.io/husky/).
`npm install` installs them through the `prepare` script, so every contributor runs the same
checks, people and AI coding agents alike.

| Hook         | Runs                                                                                                                                                                                                                 | Time    |
| ------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------- |
| `pre-commit` | `lint-staged` on the **staged files**: `oxlint --fix`, then `prettier --write`; fixes are added to the commit                                                                                                        | seconds |
|              | `npm test` (Vitest unit + component tests)                                                                                                                                                                           | ~5 s    |
| `pre-push`   | `npm run test:e2e` (Playwright), **only** if the pushed commits touch app code: `app/`, `components/`, `lib/`, `e2e/`, `hooks/`, `public/`, `scripts/`, `proxy.ts`, `instrumentation.ts`, configs or `package*.json` | 1–2 min |

Pushes that only change docs or notes skip Playwright.

**Don't bypass the hooks.** That means no `git commit --no-verify`, no `HUSKY=0`, and no
unsetting `core.hooksPath`. If a hook fails, fix the cause and commit or push again. CI runs
the same checks, so a bypass only moves the failure into your pull request.

**Troubleshooting**

- **`husky - command not found`** (for example `node`, `npx`): git runs the hooks in a
  non-interactive shell, which may not load your Node version manager. Put the PATH setup in
  `~/.config/husky/init.sh`, which husky sources before every hook. For fnm:
  ```sh
  eval "$(fnm env)"
  ```
- **The pre-push hook fails on a port in use:** the e2e run uses ports 3100 (app) and 5434
  (database). They are separate from the dev server's 3000 and 5433, so `npm run dev` can keep
  running.
- **Debugging a hook:** `HUSKY=2 git commit …` prints every command the hook runs.

## Scripts

<!-- AUTO-GENERATED from package.json scripts -->

| Command                                        | Description                                                                                                                                                                            |
| ---------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `npm run dev`                                  | Dev server on :3000, plus the local PGlite database                                                                                                                                    |
| `npm run build`                                | Production build (type-checks)                                                                                                                                                         |
| `npm run start`                                | Serve the production build, plus the local database                                                                                                                                    |
| `npm run db:serve`                             | Local database only (for `db:studio` / psql)                                                                                                                                           |
| `npm test`                                     | Vitest: unit (`lib/**/*.test.ts`) and component (`components/**/*.test.tsx`) tests                                                                                                     |
| `npm run test:watch`                           | Vitest in watch mode                                                                                                                                                                   |
| `npm run test:coverage`                        | Vitest with v8 coverage; HTML report in `coverage/`                                                                                                                                    |
| `npm run test:e2e`                             | Playwright: production build, throwaway seeded database, :3100. `E2E_SKIP_BUILD=1` reuses the last build                                                                               |
| `npm run test:e2e:ui`                          | Playwright UI mode                                                                                                                                                                     |
| `npm run storybook`                            | Storybook on :6006                                                                                                                                                                     |
| `npm run build-storybook`                      | Static Storybook build (CI runs it)                                                                                                                                                    |
| `npm run format`                               | Prettier over the whole repo                                                                                                                                                           |
| `npm run format:check`                         | Prettier check, as run in CI                                                                                                                                                           |
| `npm run lint:oxlint`                          | oxlint with fixes. The aggregate `npm run lint` is currently broken: `run-s` (npm-run-all) isn't installed                                                                             |
| `npm run db:generate`                          | drizzle-kit: create a migration from schema changes                                                                                                                                    |
| `npm run db:migrate`                           | drizzle-kit: apply migrations by hand (normally automatic on start)                                                                                                                    |
| `npm run db:studio`                            | drizzle-kit database browser (needs the database up)                                                                                                                                   |
| `npm run db:seed`                              | Seed demo data: users, catalog, properties, spools + history, groups, lends (`scripts/seed-dev-data.ts`; `-- --reset` / `-- --clean`; refuses a non-local DB without `--allow-remote`) |
| `npm run db:import -- --manufacturer <slug>`   | Import catalog data from SpoolmanDB                                                                                                                                                    |
| `npm run admin:create -- <email> <name>`       | Create or promote an admin                                                                                                                                                             |
| `npm run token:create -- <email> <token-name>` | Create a REST API token                                                                                                                                                                |
| `npm run prepare`                              | (Re)install the git hooks                                                                                                                                                              |

<!-- /AUTO-GENERATED -->

## Code style

- **Formatting:** Prettier (`.prettierrc`, with the Tailwind class-sorting plugin). Files under
  `.claude/`, `drizzle/` and generated files are ignored (`.prettierignore`). The pre-commit
  hook formats what you stage, so you rarely need `npm run format` by hand.
- **Lint:** oxlint.
- **Types:** strict TypeScript.
- **`git blame`:** the one-off repo-wide formatting commit is listed in
  `.git-blame-ignore-revs`. GitHub skips it automatically. Locally:
  `git config blame.ignoreRevsFile .git-blame-ignore-revs`.

## Tests

- **Every component gets Storybook stories and a unit test.** The tests reuse the stories
  through `composeStories`; see "Storybook & component tests" in `CLAUDE.md`.
- **Domain logic** in `lib/` gets plain Vitest tests next to the file.
- **End-to-end tests** live in `e2e/`. They seed their own database (`e2e/seed.ts`); the
  counts they expect are in `e2e/data.ts`.

## Pull requests

- Branch off the target branch. Redesign work goes to `feature/redesign-spoolhouse-ui`,
  everything else to `main`.
- Commit messages follow [Conventional Commits](https://www.conventionalcommits.org/)
  (`feat(scope): …`, `fix: …`, `docs: …`, `chore: …`).
- Before opening the PR, check that:
  - [ ] the hooks ran on every commit and push (no `--no-verify`)
  - [ ] `npx tsc --noEmit` is clean (CI checks it; the hooks don't)
  - [ ] new components have stories and a test
  - [ ] schema changes come with a migration (`npm run db:generate`) that works on existing
        production data
  - [ ] if REST endpoints changed, `lib/openapi.ts` and `docs/api.md` are updated
- CI (`.github/workflows/deploy.yml`, `check` job) runs typecheck, oxlint, `format:check`,
  `npm test` and the Storybook build, plus a full `next build` on PRs. Only `main` is deployed.
