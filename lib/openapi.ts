import { FILAMENT_TYPES } from '@/lib/filament';

// OpenAPI 3 spec for the external REST API (/api/v1). Served at
// GET /api/v1/openapi.json and rendered by Swagger UI on /api-docs.
// Keep in sync with the route handlers in app/api/v1/ and docs/api.md.

const errorResponse = (description: string) => ({
  description,
  content: {
    'application/json': { schema: { $ref: '#/components/schemas/Error' } },
  },
});

const spoolResponse = (description: string) => ({
  description,
  content: {
    'application/json': {
      schema: {
        type: 'object',
        properties: { spool: { $ref: '#/components/schemas/Spool' } },
        required: ['spool'],
      },
    },
  },
});

const idParameter = {
  name: 'id',
  in: 'path',
  required: true,
  schema: { type: 'string', format: 'uuid' },
  description: 'Spool id (UUID)',
};

export const openApiSpec = {
  openapi: '3.0.3',
  info: {
    title: 'Spoolhouse REST API',
    version: '2.0.0',
    description:
      'HTTP/JSON API for external clients (scripts, scale/NFC readers, shortcuts). It acts on ' +
      'behalf of a single user with the same ownership rules as the webapp. Create an API token ' +
      'on **Account → API tokens**; the plaintext token (`sph_…`) is shown once. A physical ' +
      '**spool** references a global **material** (manufacturer/name/type/colour) and a **spool ' +
      'type** (empty-spool weight). All weights are gram integers.',
  },
  servers: [{ url: '/api/v1' }],
  security: [{ bearerAuth: [] }],
  tags: [
    { name: 'auth' },
    { name: 'catalog', description: 'Global materials & spool types' },
    { name: 'spools', description: 'Your physical spools' },
  ],
  paths: {
    '/me': {
      get: {
        tags: ['auth'],
        summary: 'Identify the token owner',
        operationId: 'getMe',
        responses: {
          '200': {
            description: 'Token owner',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/User' },
              },
            },
          },
          '401': errorResponse('Missing or invalid API token'),
        },
      },
    },
    '/materials': {
      get: {
        tags: ['catalog'],
        summary: 'List usable materials',
        operationId: 'listMaterials',
        responses: {
          '200': {
            description: 'Approved materials + your own pending ones',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    materials: {
                      type: 'array',
                      items: { $ref: '#/components/schemas/Material' },
                    },
                  },
                  required: ['materials'],
                },
              },
            },
          },
          '401': errorResponse('Missing or invalid API token'),
        },
      },
    },
    '/spool-types': {
      get: {
        tags: ['catalog'],
        summary: 'List usable spool types',
        operationId: 'listSpoolTypes',
        responses: {
          '200': {
            description: 'Approved spool types + your own pending ones',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    spoolTypes: {
                      type: 'array',
                      items: { $ref: '#/components/schemas/SpoolType' },
                    },
                  },
                  required: ['spoolTypes'],
                },
              },
            },
          },
          '401': errorResponse('Missing or invalid API token'),
        },
      },
    },
    '/spools': {
      get: {
        tags: ['spools'],
        summary: 'List your spools',
        operationId: 'listSpools',
        responses: {
          '200': {
            description: 'Your spools, newest first',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    spools: {
                      type: 'array',
                      items: { $ref: '#/components/schemas/Spool' },
                    },
                  },
                  required: ['spools'],
                },
              },
            },
          },
          '401': errorResponse('Missing or invalid API token'),
        },
      },
      post: {
        tags: ['spools'],
        summary: 'Create a spool',
        description:
          'From existing material + spool-type ids (see /materials and /spool-types).',
        operationId: 'createSpool',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/SpoolCreate' },
            },
          },
        },
        responses: {
          '201': spoolResponse('Created spool'),
          '400': errorResponse('Invalid JSON or input'),
          '401': errorResponse('Missing or invalid API token'),
        },
      },
    },
    '/spools/{id}': {
      get: {
        tags: ['spools'],
        summary: 'Get a spool',
        operationId: 'getSpool',
        parameters: [idParameter],
        responses: {
          '200': spoolResponse('The spool'),
          '401': errorResponse('Missing or invalid API token'),
          '404': errorResponse('Not found (or not yours)'),
        },
      },
      patch: {
        tags: ['spools'],
        summary: 'Update a spool',
        description:
          'Partial update: any subset of materialId, spoolTypeId, weights, tagUid.',
        operationId: 'updateSpool',
        parameters: [idParameter],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/SpoolUpdate' },
            },
          },
        },
        responses: {
          '200': spoolResponse('Updated spool'),
          '400': errorResponse('Invalid JSON or input'),
          '401': errorResponse('Missing or invalid API token'),
          '404': errorResponse('Not found (or not yours)'),
        },
      },
      delete: {
        tags: ['spools'],
        summary: 'Delete a spool',
        operationId: 'deleteSpool',
        parameters: [idParameter],
        responses: {
          '204': { description: 'Deleted' },
          '401': errorResponse('Missing or invalid API token'),
          '404': errorResponse('Not found (or not yours)'),
        },
      },
    },
    '/spools/{id}/weight': {
      put: {
        tags: ['spools'],
        summary: 'Re-weigh a spool by id',
        operationId: 'setSpoolWeight',
        parameters: [idParameter],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/WeightUpdate' },
            },
          },
        },
        responses: {
          '200': spoolResponse('Updated spool'),
          '400': errorResponse('Invalid JSON or input'),
          '401': errorResponse('Missing or invalid API token'),
          '404': errorResponse('Not found (or not yours)'),
        },
      },
    },
    '/spools/weigh': {
      post: {
        tags: ['spools'],
        summary: 'Register or refresh a spool by NFC tag',
        description:
          'The endpoint a scale/NFC reader calls. If a spool with this tagUid already exists ' +
          'for you, its weight is refreshed. Otherwise a new spool is registered — include at ' +
          'least manufacturer and name (the material/spool-type are created on the fly).',
        operationId: 'weighByTag',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/WeighByTag' },
            },
          },
        },
        responses: {
          '200': {
            description: 'Existing spool refreshed',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    action: { type: 'string', enum: ['refreshed'] },
                    spool: { $ref: '#/components/schemas/Spool' },
                  },
                  required: ['action', 'spool'],
                },
              },
            },
          },
          '201': {
            description: 'New spool registered',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    action: { type: 'string', enum: ['registered'] },
                    spool: { $ref: '#/components/schemas/Spool' },
                  },
                  required: ['action', 'spool'],
                },
              },
            },
          },
          '400': errorResponse(
            'Invalid input, or tag unknown and no material fields to register'
          ),
          '401': errorResponse('Missing or invalid API token'),
        },
      },
    },
  },
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        description:
          'API token created on Account → API tokens (format `sph_…`).',
      },
    },
    schemas: {
      Error: {
        type: 'object',
        properties: {
          error: {
            type: 'object',
            properties: {
              code: {
                type: 'string',
                enum: [
                  'unauthorized',
                  'invalid_json',
                  'invalid_input',
                  'not_found',
                  'not_registered',
                ],
              },
              message: { type: 'string' },
            },
            required: ['code', 'message'],
          },
        },
        required: ['error'],
      },
      User: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          name: { type: 'string' },
          email: { type: 'string', format: 'email' },
          role: { type: 'string', nullable: true },
        },
        required: ['id', 'name', 'email'],
      },
      Material: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          manufacturer: { type: 'string', example: 'Bambu Lab' },
          name: { type: 'string', example: 'PLA Matte' },
          filamentType: { type: 'string', enum: FILAMENT_TYPES },
          color: { type: 'string', nullable: true, example: '#BB3D43' },
          status: { type: 'string', enum: ['approved', 'pending'] },
          properties: {
            type: 'array',
            description:
              'Read-only datasheet values (density, temps, tensile strength, …). `verified` is false for community-entered values not yet reviewed by an admin.',
            items: {
              type: 'object',
              properties: {
                key: { type: 'string', example: 'density' },
                name: { type: 'string', example: 'Density' },
                unit: { type: 'string', nullable: true, example: 'g/cm³' },
                value: { type: 'string', example: '1.24' },
                verified: { type: 'boolean' },
              },
              required: ['key', 'name', 'unit', 'value', 'verified'],
            },
          },
        },
        required: [
          'id',
          'manufacturer',
          'name',
          'filamentType',
          'status',
          'properties',
        ],
      },
      SpoolType: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          manufacturer: { type: 'string', example: 'Bambu Lab' },
          name: { type: 'string', example: 'Bambu Lab spool' },
          emptyWeightGrams: { type: 'integer', example: 250 },
          status: { type: 'string', enum: ['approved', 'pending'] },
        },
        required: ['id', 'manufacturer', 'name', 'emptyWeightGrams', 'status'],
      },
      Spool: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          tagUid: {
            type: 'string',
            nullable: true,
            example: 'D8836C2EB0E94080AFD875E41EF80492',
          },
          materialId: { type: 'string', format: 'uuid' },
          material: {
            type: 'object',
            properties: {
              manufacturer: { type: 'string' },
              name: { type: 'string' },
              filamentType: { type: 'string' },
              color: { type: 'string', nullable: true },
            },
          },
          spoolTypeId: { type: 'string', format: 'uuid' },
          spoolTypeLabel: { type: 'string' },
          emptyWeightGrams: { type: 'integer' },
          fullFilamentWeightGrams: { type: 'integer' },
          measuredTotalWeightGrams: { type: 'integer' },
          filamentLeftGrams: { type: 'integer' },
          percentLeft: { type: 'number' },
          isEmpty: { type: 'boolean' },
          isLow: { type: 'boolean' },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' },
        },
        required: [
          'id',
          'materialId',
          'spoolTypeId',
          'measuredTotalWeightGrams',
          'filamentLeftGrams',
        ],
      },
      SpoolCreate: {
        type: 'object',
        properties: {
          materialId: { type: 'string', format: 'uuid' },
          spoolTypeId: { type: 'string', format: 'uuid' },
          fullFilamentWeightGrams: {
            type: 'integer',
            minimum: 1,
            example: 1000,
          },
          measuredTotalWeightGrams: {
            type: 'integer',
            minimum: 0,
            example: 1240,
          },
          tagUid: { type: 'string', nullable: true },
        },
        required: [
          'materialId',
          'spoolTypeId',
          'fullFilamentWeightGrams',
          'measuredTotalWeightGrams',
        ],
      },
      SpoolUpdate: {
        type: 'object',
        description: 'Any subset of the create fields; at least one required.',
        properties: {
          materialId: { type: 'string', format: 'uuid' },
          spoolTypeId: { type: 'string', format: 'uuid' },
          fullFilamentWeightGrams: { type: 'integer', minimum: 1 },
          measuredTotalWeightGrams: { type: 'integer', minimum: 0 },
          tagUid: { type: 'string', nullable: true },
        },
        minProperties: 1,
      },
      WeightUpdate: {
        type: 'object',
        properties: {
          measuredTotalWeightGrams: {
            type: 'integer',
            minimum: 0,
            example: 830,
          },
        },
        required: ['measuredTotalWeightGrams'],
      },
      WeighByTag: {
        type: 'object',
        properties: {
          tagUid: {
            type: 'string',
            example: 'D8836C2EB0E94080AFD875E41EF80492',
          },
          measuredTotalWeightGrams: {
            type: 'integer',
            minimum: 0,
            example: 830,
          },
          manufacturer: {
            type: 'string',
            example: 'Bambu Lab',
            description: 'for registration',
          },
          name: {
            type: 'string',
            example: 'PLA Matte',
            description: 'for registration',
          },
          filamentType: {
            type: 'string',
            enum: FILAMENT_TYPES,
            description: 'for registration',
          },
          color: { type: 'string', nullable: true, example: '#BB3D43' },
          fullFilamentWeightGrams: { type: 'integer', example: 1000 },
          emptyWeightGrams: {
            type: 'integer',
            example: 250,
            description: 'empty spool weight for registration',
          },
        },
        required: ['tagUid', 'measuredTotalWeightGrams'],
      },
    },
  },
} as const;
