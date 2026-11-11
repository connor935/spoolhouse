# REST API for external clients — design

Date: 2026-07-05 · Branch: `feat_REST`

## Goal

External clients (scripts, scale integrations, mobile shortcuts) can authenticate against
Spoolhouse and manage the signed-in user's filament inventory over plain HTTP/JSON. Users
create long-lived **API tokens** in the webapp (`/account`); a token acts on behalf of its
owner with the same ownership rules as the UI.

## Approaches considered

1. **Custom `api_tokens` table + Bearer auth (chosen).** One small table, tokens hashed with
   SHA-256, verified by a `lib/` helper in each route handler. Matches the codebase's
   explicit-SQL authorization discipline, leaves the generated better-auth schema untouched,
   and the whole auth surface stays readable in one file.
2. **better-auth `apiKey` plugin.** Less hand-rolled crypto, but pulls in generated schema
   churn (`npx @better-auth/cli generate`), plugin-specific semantics (rate limiting,
   sessions-from-keys), and more magic than this app needs.
3. **Session-cookie API only.** No new table, but useless for headless clients — the whole
   point is non-browser access.

## Token model

- Table `api_tokens`: `id` (autoincrement), `userId` (FK → `user.id`, cascade delete),
  `name`, `tokenHash` (SHA-256 hex, unique), `tokenPrefix` (first 12 chars, display only),
  `createdAt`, `lastUsedAt` (nullable).
- Token format: `sph_` + 32 random bytes base64url (~43 chars). The plaintext is shown
  **exactly once** at creation; only the hash is stored. Revoking deletes the row.
- No expiry in v1 (self-hosted, user-revocable). YAGNI; the column can be added later.

## Authentication

`Authorization: Bearer sph_…` on every request. `lib/api-auth.ts` exposes
`authenticateApiRequest(request)` → the token owner (user row) or `null`; it hashes the
presented token, looks it up, and touches `lastUsedAt`. Route handlers return
`401 {"error":{"code":"unauthorized", …}}` when it fails. Constant-time comparison is
inherent: lookup is by hash of a high-entropy secret.

`proxy.ts` currently redirects everything except `/api/auth` to `/login`; the matcher is
widened to exempt all of `/api/` — API routes do their own (authoritative) auth anyway.

## Endpoints (v1)

All under `/api/v1`, JSON in/out, errors as `{"error":{"code","message"}}`.

| Method & path                      | Purpose                                                                       |
| ---------------------------------- | ----------------------------------------------------------------------------- |
| `GET /api/v1/me`                   | Token check; returns id, name, email, role                                    |
| `GET /api/v1/spool-types`          | Spool types usable by the token owner (approved + own pending)                |
| `GET /api/v1/filaments`            | All own filaments as `FilamentView` + timestamps                              |
| `POST /api/v1/filaments`           | Create (201); same fields/validation as the UI form                           |
| `GET /api/v1/filaments/:id`        | Single filament (404 if not owned)                                            |
| `PATCH /api/v1/filaments/:id`      | Partial update of the input fields                                            |
| `PUT /api/v1/filaments/:id/weight` | Re-weigh: `{"measuredTotalWeightGrams": n}` — the core scale-integration call |
| `DELETE /api/v1/filaments/:id`     | Delete (204)                                                                  |

Ownership enforced in SQL (`WHERE userId = owner.id`), never from client ids — same rule as
server actions. Spool-type usability check is extracted from `app/actions/filaments.ts` into
a shared `lib/spool-type-usable.ts` used by both the action and the API. Groups/lending stay
out of v1 (webapp-only for now).

Mutating routes call `revalidatePath("/")` like the server actions do, so an open dashboard
tab refreshes on next navigation; `/` is `force-dynamic` anyway.

## Webapp token management

`/account` gains an "API tokens" section (server page loads the list, client component
renders it): create with a name → dialog/inline panel shows the plaintext once with a copy
button; list shows name, prefix, created, last used; revoke deletes immediately. Server
actions in `app/actions/api-tokens.ts` (`getApiTokens`, `createApiToken`, `revokeApiToken`),
each starting with `requireUser()`.

## Validation & errors

Body validation mirrors the existing action semantics (trimmed non-empty strings, positive
integer gram values, `Math.round` on weights, `assertSpoolTypeUsable`) and returns `400`
with a message instead of throwing. Unknown routes/ids → `404`; malformed JSON → `400`.

## Testing

The repo has no test infrastructure; introducing one is out of scope here. Verification is
end-to-end: `tsc --noEmit`, production build, then a scratch-DB dev server exercised with
curl against every endpoint (auth failure cases included).
