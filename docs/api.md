# Spoolhouse REST API (v1)

HTTP/JSON API for external clients (scripts, scale/NFC readers, shortcuts). It acts on
behalf of a single user with the same ownership rules as the webapp.

Interactive **Swagger UI**: `/api-docs` (sign in first). Machine-readable OpenAPI 3 spec:
`GET /api/v1/openapi.json` (unauthenticated; source of truth in `lib/openapi.ts`).

## Data model

A physical **spool** references a global **material** (manufacturer, name, filament type,
colour) and a **spool type** (the empty-spool weight). Remaining filament =
`measuredTotalWeightGrams − spoolType.emptyWeightGrams`. All weights are gram integers.
All resource ids (`materialId`, `spoolTypeId`, spool `:id`, …) are **UUID strings**, not numbers.

## Authentication

Create a token on **Account → API tokens** in the webapp (or headlessly with
`npm run token:create -- <email> <token-name>`). The plaintext token (`sph_…`) is shown
exactly once. Send it on every request:

```
Authorization: Bearer sph_XXXXXXXX…
```

Missing/invalid tokens get `401 {"error":{"code":"unauthorized",…}}`. Revoking a token on
`/account` invalidates it immediately. Errors are `{"error":{"code","message"}}` (400/401/404/409).

`tagUid` is unique per user: creating or patching a spool with a tag another of your
spools already carries returns `409 {"error":{"code":"tag_conflict",…}}`.

## Endpoints

| Method & path                      | Purpose                                                                                                                       |
| ---------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| `GET /api/v1/me`                   | Token check; returns id, name, email, role                                                                                    |
| `GET /api/v1/materials`            | Materials usable by the owner (approved + own pending), each with read-only datasheet `properties` — paginated, supports `?q` |
| `GET /api/v1/spool-types`          | Spool types usable by the owner                                                                                               |
| `GET /api/v1/spools`               | All own spools (computed amounts + material + tagUid)                                                                         |
| `POST /api/v1/spools`              | Create a spool from `materialId` + `spoolTypeId` + weights                                                                    |
| `GET /api/v1/spools/:id`           | One spool                                                                                                                     |
| `PATCH /api/v1/spools/:id`         | Partial update (materialId, spoolTypeId, weights, tagUid, details — see below)                                                |
| `DELETE /api/v1/spools/:id`        | Delete (204)                                                                                                                  |
| `PUT /api/v1/spools/:id/weight`    | Re-weigh by id: `{"measuredTotalWeightGrams": n}`                                                                             |
| `GET /api/v1/spools/:id/weighings` | Weighing history, newest first (`?limit`, default 100, max 500)                                                               |
| `POST /api/v1/spools/weigh`        | **Register-or-refresh by NFC tag** — the scale/reader call                                                                    |

### Spool details and weighing history

Besides the weights, a spool carries optional details, accepted by `POST`/`PATCH` and
returned on every spool (`null` clears one on `PATCH`):

| Field            | Meaning                                    |
| ---------------- | ------------------------------------------ |
| `pricePaidCents` | Purchase price in euro cents (integer ≥ 0) |
| `purchasedAt`    | Purchase date, `YYYY-MM-DD`                |
| `location`       | Free-text storage place, ≤ 100 chars       |
| `lastDriedAt`    | ISO date-time of the last drying           |

Responses also carry `needsDrying` (read-only): a hygroscopic type (Nylon/PVA after 14
days, TPU/PC 30, PETG 60) not dried since then — or since the spool was created.

Every write of `measuredTotalWeightGrams` — create, `PATCH`, `PUT …/weight`, the tag
weigh — appends to the spool's weighing history (`GET …/weighings`). The app derives
usage from it: the sum of weight drops between consecutive weighings.

### `GET /api/v1/materials` (search, pagination, datasheet properties)

Each material carries a `properties` array of datasheet values (density, diameters,
temps, and anything an admin has defined — tensile strength, hardness, …). Values are
community-editable in the app; `verified` is `false` until an admin reviews one.

The catalog can hold tens of thousands of materials (see the SpoolmanDB import), so the
response is one page and carries the match count:

| Param    | Default | Meaning                                                                                                                                                         |
| -------- | ------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `q`      | —       | Free-text search. Every whitespace-separated token must appear in the manufacturer, name or filament type, so `?q=polymaker+petg+red` narrows across all three. |
| `limit`  | 100     | Rows to return, capped at 500.                                                                                                                                  |
| `offset` | 0       | Rows to skip.                                                                                                                                                   |

```sh
curl -H "Authorization: Bearer $TOKEN" \
  "$BASE/api/v1/materials?q=polymaker%20petg%20red&limit=5"
```

```json
{
  "materials": [
    {
      "id": "…",
      "manufacturer": "Prusament",
      "name": "PLA Galaxy Black",
      "filamentType": "PLA",
      "color": "#1c1c2e",
      "status": "approved",
      "properties": [
        {
          "key": "density",
          "name": "Density",
          "unit": "g/cm³",
          "value": "1.24",
          "verified": true
        },
        {
          "key": "extruder_temp",
          "name": "Extruder temp",
          "unit": "°C",
          "value": "215",
          "verified": true
        }
      ]
    }
  ],
  "total": 3,
  "limit": 5,
  "offset": 0
}
```

### `POST /api/v1/spools/weigh` (the scale endpoint)

If a spool with `tagUid` already exists for the owner, its weight is refreshed (`200`,
`"action":"refreshed"`). Otherwise a new spool is registered (`201`,
`"action":"registered"`) — the material and spool type are found-or-created from the tag
data. To register, include at least `manufacturer`, `name` and `emptyWeightGrams` (> 0);
otherwise the answer is `400 not_registered`. `filamentType` must be one of the filament
types (PLA, PETG, …, defaults to `Other`); `fullFilamentWeightGrams` defaults to the
measured weight minus the empty-spool weight.

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

## Live updates in the webapp

Every API mutation also pushes a Server-Sent-Events signal to the affected users' open
browser tabs (`GET /api/events`), which then re-render with fresh data — a weigh-in shows
up on the dashboard within about a second, no reload needed. `/api/events` is **not part
of this token API**: it authenticates with the browser session cookie, carries no payload
(just "something changed" signals), and isn't in the OpenAPI spec. API clients like the
scale don't need it — keep using the endpoints above.
