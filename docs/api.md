# Spoolhouse REST API (v1)

HTTP/JSON API for external clients (scripts, scale/NFC readers, shortcuts). It acts on
behalf of a single user with the same ownership rules as the webapp.

Interactive **Swagger UI**: `/api-docs` (sign in first). Machine-readable OpenAPI 3 spec:
`GET /api/v1/openapi.json` (unauthenticated; source of truth in `lib/openapi.ts`).

## Data model

A physical **spool** references a global **material** (manufacturer, name, filament type,
colour) and a **spool type** (the empty-spool weight). Remaining filament =
`measuredTotalWeightGrams − spoolType.emptyWeightGrams`. All weights are gram integers.

## Authentication

Create a token on **Account → API tokens** in the webapp (or headlessly with
`npm run token:create -- <email> <token-name>`). The plaintext token (`sph_…`) is shown
exactly once. Send it on every request:

```
Authorization: Bearer sph_XXXXXXXX…
```

Missing/invalid tokens get `401 {"error":{"code":"unauthorized",…}}`. Revoking a token on
`/account` invalidates it immediately. Errors are `{"error":{"code","message"}}` (400/401/404).

## Endpoints

| Method & path | Purpose |
|---|---|
| `GET /api/v1/me` | Token check; returns id, name, email, role |
| `GET /api/v1/materials` | Materials usable by the owner (approved + own pending) |
| `GET /api/v1/spool-types` | Spool types usable by the owner |
| `GET /api/v1/spools` | All own spools (computed amounts + material + tagUid) |
| `POST /api/v1/spools` | Create a spool from `materialId` + `spoolTypeId` + weights |
| `GET /api/v1/spools/:id` | One spool |
| `PATCH /api/v1/spools/:id` | Partial update (materialId, spoolTypeId, weights, tagUid) |
| `DELETE /api/v1/spools/:id` | Delete (204) |
| `PUT /api/v1/spools/:id/weight` | Re-weigh by id: `{"measuredTotalWeightGrams": n}` |
| `POST /api/v1/spools/weigh` | **Register-or-refresh by NFC tag** — the scale/reader call |

### `POST /api/v1/spools/weigh` (the scale endpoint)

If a spool with `tagUid` already exists for the owner, its weight is refreshed (`200`,
`"action":"refreshed"`). Otherwise a new spool is registered (`201`,
`"action":"registered"`) — the material and spool type are found-or-created from the tag
data. To register, include at least `manufacturer` and `name`.

```json
{
  "tagUid": "D8836C2EB0E94080AFD875E41EF80492",
  "measuredTotalWeightGrams": 830,
  "manufacturer": "Bambu Lab",
  "name": "PLA Matte",
  "filamentType": "PLA",
  "color": "#BB3D43",
  "fullFilamentWeightGrams": 1000,
  "emptyWeightGrams": 250
}
```

On a later weigh, sending just `{"tagUid","measuredTotalWeightGrams"}` refreshes it.

## Example: weigh from a shell

```sh
TOKEN="sph_…"
curl -s -X POST http://<host>:3000/api/v1/spools/weigh \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"tagUid":"D8836C2E…","measuredTotalWeightGrams":830}'
```

Groups and lending are not exposed in the API (webapp only).
