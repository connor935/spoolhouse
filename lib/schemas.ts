import { z } from 'zod';

// Shared validation for the two catalog tables (server actions, via
// app/actions/materials.ts / spool-types.ts) and the /api/v1/spools request
// body (REST routes). Centralizing these avoids the input checks drifting
// between the server-action and REST paths for the same fields.

const trimmedNonEmpty = (message: string) =>
  z
    .string()
    .trim()
    .min(1, message);

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
});

// The re-weigh endpoints (PUT .../weight, POST .../weigh) only ever take this
// one field.
export const measuredWeightSchema = weightGrams('measuredTotalWeightGrams', 0);

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
