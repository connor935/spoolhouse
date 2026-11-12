import { z } from 'zod';
import { FILAMENT_TYPES } from '@/lib/filament';
import { PROPERTY_VALUE_TYPES } from '@/lib/property-value';

// Shared validation for the two catalog tables (server actions, via
// app/actions/materials.ts / spool-types.ts) and the /api/v1/spools request
// body (REST routes). Centralizing these avoids the input checks drifting
// between the server-action and REST paths for the same fields.

const trimmedNonEmpty = (message: string) => z.string().trim().min(1, message);

export const materialSchema = z.object({
  manufacturer: trimmedNonEmpty(
    'Manufacturer, name and filament type are required'
  ),
  name: trimmedNonEmpty('Manufacturer, name and filament type are required'),
  filamentType: trimmedNonEmpty(
    'Manufacturer, name and filament type are required'
  ),
  color: z
    .string()
    .nullish()
    .transform((v) => v ?? null),
});

export const spoolTypeSchema = z.object({
  manufacturer: trimmedNonEmpty('Manufacturer and name are required'),
  name: trimmedNonEmpty('Manufacturer and name are required'),
  emptyWeightGrams: z
    .number({ error: 'Empty spool weight must be greater than 0 g' })
    .finite('Empty spool weight must be greater than 0 g')
    .transform((v) => Math.round(v))
    .refine((v) => v > 0, 'Empty spool weight must be greater than 0 g'),
});

const idString = (field: string) =>
  z.string().trim().min(1, `${field} must be a non-empty id string`);

// A bare id argument of a server action.
export const idSchema = idString('id').max(64, 'id is too long');

const weightGrams = (field: string, min: number) =>
  z
    .number({ error: `${field} must be a number (grams)` })
    .finite(`${field} must be a number (grams)`)
    .transform((v) => Math.round(v))
    .refine((v) => v >= min, `${field} must be at least ${min} g`);

// Create-mode shape for POST /api/v1/spools; PATCH uses `.partial()`.
export const spoolBodySchema = z.object({
  materialId: idString('materialId'),
  spoolTypeId: idString('spoolTypeId'),
  fullFilamentWeightGrams: weightGrams('fullFilamentWeightGrams', 1),
  measuredTotalWeightGrams: weightGrams('measuredTotalWeightGrams', 0),
  tagUid: z
    .string()
    .nullish()
    .transform((v) => (v && v.trim() ? v.trim() : null)),
  // Optional details (costs, storage, drying). Absent = unchanged on PATCH,
  // null clears.
  pricePaidCents: z
    .number({ error: 'pricePaidCents must be a number (cents)' })
    .int('pricePaidCents must be whole cents')
    .min(0, 'pricePaidCents must not be negative')
    .nullish(),
  purchasedAt: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'purchasedAt must be a date (YYYY-MM-DD)')
    .refine(
      (v) => !Number.isNaN(Date.parse(v)),
      'purchasedAt must be a valid date'
    )
    .nullish(),
  location: z
    .string()
    .max(100, 'location must be at most 100 characters')
    .nullish()
    .transform((v) => (v == null ? v : v.trim() || null)),
  lastDriedAt: z
    .union([z.string(), z.date()], {
      error: 'lastDriedAt must be an ISO date-time',
    })
    .nullish()
    .transform((v, ctx) => {
      if (v == null) return v;
      const d = new Date(v);
      if (Number.isNaN(d.getTime())) {
        ctx.addIssue({
          code: 'custom',
          message: 'lastDriedAt must be an ISO date-time',
        });
        return z.NEVER;
      }
      return d;
    }),
});

// Add/edit-spool server actions (app/actions/filaments.ts): the same field
// rules as the REST body, minus tagUid (not editable in the UI). Server
// actions are public POST endpoints, so this runs on every call, not only
// behind the dialog's client-side checks.
export const spoolInputSchema = spoolBodySchema.omit({ tagUid: true });

// The re-weigh endpoints (PUT .../weight, POST .../weigh) only ever take this
// one field.
export const measuredWeightSchema = weightGrams('measuredTotalWeightGrams', 0);

// Extra fields POST /api/v1/spools/weigh needs to register an unknown tag
// (found-or-created material + spool type). emptyWeightGrams is required: a
// 0 g spool type would silently overstate every remaining-filament figure
// derived from it, and spoolTypeSchema refuses it everywhere else too.
export const NOT_REGISTERED =
  'No spool for this tag. To register, include at least manufacturer, name and emptyWeightGrams.';
const registrationField = z
  .string({ error: NOT_REGISTERED })
  .trim()
  .min(1, NOT_REGISTERED);

export const weighRegistrationSchema = z.object({
  manufacturer: registrationField,
  name: registrationField,
  filamentType: z
    .enum(FILAMENT_TYPES, {
      error: `filamentType must be one of ${FILAMENT_TYPES.join(', ')}`,
    })
    .nullish()
    .transform((v) => v ?? 'Other'),
  color: z
    .string()
    .nullish()
    .transform((v) => (v && v.trim() ? v.trim() : null)),
  emptyWeightGrams: z
    .number({ error: NOT_REGISTERED })
    .pipe(spoolTypeSchema.shape.emptyWeightGrams),
  fullFilamentWeightGrams: weightGrams('fullFilamentWeightGrams', 1).optional(),
});

const optionalTrimmed = z
  .string()
  .nullish()
  .transform((v) => (v && v.trim() ? v.trim() : null));

// Admin-managed property definitions. `key` is the immutable machine slug
// (only settable at creation — updatePropertyDefinition never touches it).
export const propertyDefinitionSchema = z.object({
  key: z
    .string()
    .trim()
    .min(1, 'Key is required')
    .regex(/^[a-z0-9_]+$/, 'Key must be a lowercase slug (a–z, 0–9, _)'),
  name: trimmedNonEmpty('Name is required'),
  unit: optionalTrimmed,
  description: optionalTrimmed,
  // Decides how values are validated and normalised — see lib/property-value.ts.
  valueType: z.enum(PROPERTY_VALUE_TYPES),
});

// The editable fields of a definition (everything but the immutable key).
export const propertyDefinitionEditSchema = propertyDefinitionSchema.omit({
  key: true,
});

// Wiki-style value set on a material.
export const materialPropertyValueSchema = z.object({
  materialId: idString('materialId'),
  propertyId: idString('propertyId'),
  value: z.string().trim().min(1, 'Value is required').max(200),
});

// Maps the first Zod issue to the app's `{code, message}` REST error shape.
export function firstIssueMessage(error: z.ZodError): string {
  return error.issues[0]?.message ?? 'Invalid input';
}

// Server actions signal invalid input by throwing a plain Error (shown
// verbatim in a toast) rather than the REST layer's {code,message} envelope.
export function parseOrThrow<T>(schema: z.ZodType<T>, input: unknown): T {
  const result = schema.safeParse(input);
  if (!result.success) throw new Error(firstIssueMessage(result.error));
  return result.data;
}

// The /materials catalog query (searchMaterialCatalog): filters as parsed from
// the URL, one page at a time. Bounded so a crafted call can't ask for the
// whole catalog or an unbounded IN list.
export const materialCatalogQuerySchema = z.object({
  q: z.string().trim().max(200).optional(),
  filamentTypes: z.array(z.string().trim().min(1).max(40)).max(20).optional(),
  constraints: z
    .array(
      z.object({
        id: z.string().max(64),
        propertyId: z.string().max(64),
        min: z.number().finite().nullable(),
        max: z.number().finite().nullable(),
      })
    )
    .max(20)
    .optional(),
  limit: z.number().int().min(1).max(200).default(150),
  offset: z.number().int().min(0).max(100_000).default(0),
});

// /admin/materials: the same query plus an exact review status (null = all).
export const adminMaterialQuerySchema = materialCatalogQuerySchema.extend({
  status: z.enum(['approved', 'pending', 'rejected']).nullish(),
});

// getRecentMaterialColors: how many swatches the request form offers.
export const recentColorsLimitSchema = z.number().int().min(1).max(12);
