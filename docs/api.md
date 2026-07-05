# Spoolhouse REST API (v1)

HTTP/JSON API for external clients (scripts, scale integrations, shortcuts). It acts on
behalf of a single user with the same ownership rules as the webapp.

Interactive **Swagger UI**: `/api-docs` (sign in first). Machine-readable OpenAPI 3 spec:
`GET /api/v1/openapi.json` (unauthenticated; source of truth in `lib/openapi.ts`).

## Authentication

Create a token on **Account → API tokens** in the webapp. The plaintext token
(`sph_…`) is shown exactly once — store it safely. Send it on every request:

```
Authorization: Bearer sph_XXXXXXXX…
```

Missing or invalid tokens get `401 {"error":{"code":"unauthorized",…}}`. Revoking a token
on `/account` invalidates it immediately.

## Conventions

- Base path `/api/v1`, request and response bodies are JSON.
- All weights are **gram integers**; fractional values are rounded.
- Errors: `{"error":{"code":"…","message":"…"}}` with status 400/401/404.
- Timestamps are ISO 8601 strings.

## Endpoints

### `GET /me`

Identify the token owner (use as a token check).

```json
{ "id": "…", "name": "Aaron", "email": "a@example.com", "role": "user" }
```

### `GET /spool-types`

Spool types you may attach to a filament: all approved ones plus your own pending
submissions.

```json
{ "spoolTypes": [ { "id": 1, "manufacturer": "Prusament", "name": "Standard",
  "emptyWeightGrams": 216, "status": "approved" } ] }
```

### `GET /filaments`

Your spools, newest first. Each filament includes the computed fields the dashboard shows
(`filamentLeftGrams`, `percentLeft`, `isEmpty`, `isLow`, …).

```json
{ "filaments": [ {
  "id": 7, "name": "Galaxy Black", "manufacturer": "Prusament", "filamentType": "PLA",
  "color": "black", "spoolTypeId": 1, "spoolTypeLabel": "Prusament — Standard (216 g)",
  "emptyWeightGrams": 216, "fullFilamentWeightGrams": 1000,
  "measuredTotalWeightGrams": 830, "filamentLeftGrams": 614, "fullTotalWeightGrams": 1216,
  "percentLeft": 61.4, "isEmpty": false, "isLow": false, "lentToName": null,
  "createdAt": "2026-07-05T12:00:00.000Z", "updatedAt": "2026-07-05T12:00:00.000Z"
} ] }
```

### `POST /filaments` → 201

Create a spool. `color` is optional; everything else is required. `filamentType` must be
one of `PLA, PETG, ABS, ASA, TPU, Nylon, PC, PVA, HIPS, Other`. `spoolTypeId` must be
usable by you (see `GET /spool-types`).

```json
{ "name": "Galaxy Black", "manufacturer": "Prusament", "filamentType": "PLA",
  "color": "black", "spoolTypeId": 1, "fullFilamentWeightGrams": 1000,
  "measuredTotalWeightGrams": 1216 }
```

Returns `{"filament": …}` like `GET /filaments/:id`.

### `GET /filaments/:id`

Single spool; `404` if it doesn't exist or isn't yours.

### `PATCH /filaments/:id`

Partial update — send any subset of the `POST` fields.

### `PUT /filaments/:id/weight`

Re-weigh: put the spool on the scale and store the total weight. Remaining filament is
derived from this minus the spool type's empty weight. The main call for scale
integrations.

```json
{ "measuredTotalWeightGrams": 830 }
```

Returns the updated `{"filament": …}`.

### `DELETE /filaments/:id` → 204

## Example: re-weigh from a shell

```sh
TOKEN="sph_…"
curl -s -X PUT http://localhost:3000/api/v1/filaments/7/weight \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"measuredTotalWeightGrams": 830}'
```

Groups and lending are not exposed in v1 (webapp only); `lentToName` is always `null` in
API responses.
