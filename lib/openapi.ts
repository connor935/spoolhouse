import { FILAMENT_TYPES } from "@/lib/filament"

// OpenAPI 3.0 spec for the external REST API (/api/v1). Served at
// GET /api/v1/openapi.json and rendered by Swagger UI on /api-docs.
// Keep in sync with the route handlers in app/api/v1/ and docs/api.md.

const filamentInputProperties = {
  name: { type: "string", minLength: 1, example: "Galaxy Black" },
  manufacturer: { type: "string", minLength: 1, example: "Prusament" },
  filamentType: { type: "string", enum: FILAMENT_TYPES, example: "PLA" },
  color: { type: "string", nullable: true, example: "black" },
  spoolTypeId: {
    type: "integer",
    minimum: 1,
    description: "Must be usable by you — see GET /spool-types",
    example: 1,
  },
  fullFilamentWeightGrams: {
    type: "integer",
    minimum: 1,
    description: "Nominal amount of filament on a full spool (g)",
    example: 1000,
  },
  measuredTotalWeightGrams: {
    type: "integer",
    minimum: 0,
    description: "Last measured total weight of spool + filament (g)",
    example: 1216,
  },
} as const

const errorResponse = (description: string) => ({
  description,
  content: {
    "application/json": { schema: { $ref: "#/components/schemas/Error" } },
  },
})

const filamentResponse = (description: string) => ({
  description,
  content: {
    "application/json": {
      schema: {
        type: "object",
        properties: { filament: { $ref: "#/components/schemas/Filament" } },
        required: ["filament"],
      },
    },
  },
})

const idParameter = {
  name: "id",
  in: "path",
  required: true,
  schema: { type: "integer", minimum: 1 },
  description: "Filament id",
}

export const openApiSpec = {
  openapi: "3.0.3",
  info: {
    title: "Spoolhouse REST API",
    version: "1.0.0",
    description:
      "HTTP/JSON API for external clients (scripts, scale integrations, shortcuts). " +
      "It acts on behalf of a single user with the same ownership rules as the webapp. " +
      "Create an API token on **Account → API tokens** in the webapp; the plaintext " +
      "token (`sph_…`) is shown exactly once. All weights are gram integers; " +
      "fractional values are rounded. Groups and lending are not exposed in v1.",
  },
  servers: [{ url: "/api/v1" }],
  security: [{ bearerAuth: [] }],
  tags: [
    { name: "auth", description: "Token owner" },
    { name: "spool-types", description: "Global spool-type catalog" },
    { name: "filaments", description: "Your filament spools" },
  ],
  paths: {
    "/me": {
      get: {
        tags: ["auth"],
        summary: "Identify the token owner",
        description: "Use as a token check.",
        operationId: "getMe",
        responses: {
          "200": {
            description: "The token owner",
            content: {
              "application/json": { schema: { $ref: "#/components/schemas/User" } },
            },
          },
          "401": errorResponse("Missing or invalid API token"),
        },
      },
    },
    "/spool-types": {
      get: {
        tags: ["spool-types"],
        summary: "List usable spool types",
        description:
          "Spool types you may attach to a filament: all approved ones plus your own pending submissions.",
        operationId: "listSpoolTypes",
        responses: {
          "200": {
            description: "Usable spool types",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    spoolTypes: {
                      type: "array",
                      items: { $ref: "#/components/schemas/SpoolType" },
                    },
                  },
                  required: ["spoolTypes"],
                },
              },
            },
          },
          "401": errorResponse("Missing or invalid API token"),
        },
      },
    },
    "/filaments": {
      get: {
        tags: ["filaments"],
        summary: "List your filaments",
        description: "All of your spools, newest first.",
        operationId: "listFilaments",
        responses: {
          "200": {
            description: "Your filaments",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    filaments: {
                      type: "array",
                      items: { $ref: "#/components/schemas/Filament" },
                    },
                  },
                  required: ["filaments"],
                },
              },
            },
          },
          "401": errorResponse("Missing or invalid API token"),
        },
      },
      post: {
        tags: ["filaments"],
        summary: "Create a filament",
        description: "Same fields and validation as the webapp form.",
        operationId: "createFilament",
        requestBody: {
          required: true,
          content: {
            "application/json": { schema: { $ref: "#/components/schemas/FilamentCreate" } },
          },
        },
        responses: {
          "201": filamentResponse("The created filament"),
          "400": errorResponse("Invalid JSON or input"),
          "401": errorResponse("Missing or invalid API token"),
        },
      },
    },
    "/filaments/{id}": {
      get: {
        tags: ["filaments"],
        summary: "Get a filament",
        operationId: "getFilament",
        parameters: [idParameter],
        responses: {
          "200": filamentResponse("The filament"),
          "401": errorResponse("Missing or invalid API token"),
          "404": errorResponse("Filament not found (or not yours)"),
        },
      },
      patch: {
        tags: ["filaments"],
        summary: "Update a filament",
        description: "Partial update — send any subset of the create fields.",
        operationId: "updateFilament",
        parameters: [idParameter],
        requestBody: {
          required: true,
          content: {
            "application/json": { schema: { $ref: "#/components/schemas/FilamentUpdate" } },
          },
        },
        responses: {
          "200": filamentResponse("The updated filament"),
          "400": errorResponse("Invalid JSON, invalid input, or no updatable fields"),
          "401": errorResponse("Missing or invalid API token"),
          "404": errorResponse("Filament not found (or not yours)"),
        },
      },
      delete: {
        tags: ["filaments"],
        summary: "Delete a filament",
        operationId: "deleteFilament",
        parameters: [idParameter],
        responses: {
          "204": { description: "Deleted" },
          "401": errorResponse("Missing or invalid API token"),
          "404": errorResponse("Filament not found (or not yours)"),
        },
      },
    },
    "/filaments/{id}/weight": {
      put: {
        tags: ["filaments"],
        summary: "Re-weigh a filament",
        description:
          "Put the spool on the scale and store the total weight. Remaining filament is " +
          "derived from this minus the spool type's empty weight. The main call for scale integrations.",
        operationId: "setMeasuredWeight",
        parameters: [idParameter],
        requestBody: {
          required: true,
          content: {
            "application/json": { schema: { $ref: "#/components/schemas/WeightUpdate" } },
          },
        },
        responses: {
          "200": filamentResponse("The updated filament"),
          "400": errorResponse("Invalid JSON or input"),
          "401": errorResponse("Missing or invalid API token"),
          "404": errorResponse("Filament not found (or not yours)"),
        },
      },
    },
  },
  components: {
    securitySchemes: {
      bearerAuth: {
        type: "http",
        scheme: "bearer",
        description:
          "API token created on Account → API tokens in the webapp (format `sph_…`).",
      },
    },
    schemas: {
      Error: {
        type: "object",
        properties: {
          error: {
            type: "object",
            properties: {
              code: {
                type: "string",
                enum: ["unauthorized", "invalid_json", "invalid_input", "not_found"],
              },
              message: { type: "string" },
            },
            required: ["code", "message"],
          },
        },
        required: ["error"],
      },
      User: {
        type: "object",
        properties: {
          id: { type: "string" },
          name: { type: "string", example: "Aaron" },
          email: { type: "string", format: "email" },
          role: { type: "string", nullable: true, example: "user" },
        },
        required: ["id", "name", "email"],
      },
      SpoolType: {
        type: "object",
        properties: {
          id: { type: "integer", example: 1 },
          manufacturer: { type: "string", example: "Prusament" },
          name: { type: "string", example: "Standard" },
          emptyWeightGrams: {
            type: "integer",
            description: "Weight of the bare, empty spool (g)",
            example: 216,
          },
          status: {
            type: "string",
            enum: ["approved", "pending"],
            description: "Pending types are your own not-yet-reviewed submissions",
          },
        },
        required: ["id", "manufacturer", "name", "emptyWeightGrams", "status"],
      },
      Filament: {
        type: "object",
        properties: {
          id: { type: "integer", example: 7 },
          ...filamentInputProperties,
          spoolTypeLabel: { type: "string", example: "Prusament — Standard (216 g)" },
          emptyWeightGrams: {
            type: "integer",
            description: "Empty-spool weight from the spool type (g)",
            example: 216,
          },
          filamentLeftGrams: {
            type: "integer",
            description: "Computed: measured total − empty spool weight, clamped ≥ 0",
            example: 614,
          },
          fullTotalWeightGrams: {
            type: "integer",
            description: "Computed: empty spool + full filament weight (g)",
            example: 1216,
          },
          percentLeft: { type: "number", example: 61.4 },
          isEmpty: { type: "boolean", description: "filamentLeftGrams ≤ 5" },
          isLow: { type: "boolean", description: "Not empty and percentLeft ≤ 15%" },
          lentToName: {
            type: "string",
            nullable: true,
            description: "Always null in API v1 (lending is webapp-only)",
          },
          createdAt: { type: "string", format: "date-time" },
          updatedAt: { type: "string", format: "date-time" },
        },
        required: [
          "id",
          "name",
          "manufacturer",
          "filamentType",
          "spoolTypeId",
          "spoolTypeLabel",
          "emptyWeightGrams",
          "fullFilamentWeightGrams",
          "measuredTotalWeightGrams",
          "filamentLeftGrams",
          "fullTotalWeightGrams",
          "percentLeft",
          "isEmpty",
          "isLow",
          "createdAt",
          "updatedAt",
        ],
      },
      FilamentCreate: {
        type: "object",
        properties: filamentInputProperties,
        required: [
          "name",
          "manufacturer",
          "filamentType",
          "spoolTypeId",
          "fullFilamentWeightGrams",
          "measuredTotalWeightGrams",
        ],
      },
      FilamentUpdate: {
        type: "object",
        description: "Any subset of the create fields; at least one is required.",
        properties: filamentInputProperties,
        minProperties: 1,
      },
      WeightUpdate: {
        type: "object",
        properties: {
          measuredTotalWeightGrams: {
            type: "integer",
            minimum: 0,
            description: "New measured total weight of spool + filament (g)",
            example: 830,
          },
        },
        required: ["measuredTotalWeightGrams"],
      },
    },
  },
} as const
