import "server-only"

import { and, eq } from "drizzle-orm"
import { db } from "@/lib/db"
import { filaments, spoolTypes, type Filament, type SpoolType } from "@/lib/db/schema"
import { FILAMENT_TYPES, toFilamentView } from "@/lib/filament"

// Helpers shared by the /api/v1/filaments route handlers.

export function serializeFilament(f: Filament, st: SpoolType) {
  return {
    ...toFilamentView(f, st),
    createdAt: f.createdAt.toISOString(),
    updatedAt: f.updatedAt.toISOString(),
  }
}

export async function getOwnedFilamentWithSpoolType(id: number, userId: string) {
  const [row] = await db
    .select()
    .from(filaments)
    .innerJoin(spoolTypes, eq(filaments.spoolTypeId, spoolTypes.id))
    .where(and(eq(filaments.id, id), eq(filaments.userId, userId)))
  return row ?? null
}

export function parseId(raw: string): number | null {
  const id = Number(raw)
  return Number.isInteger(id) && id > 0 ? id : null
}

export type FilamentBody = {
  name: string
  manufacturer: string
  filamentType: string
  color: string | null
  spoolTypeId: number
  fullFilamentWeightGrams: number
  measuredTotalWeightGrams: number
}

type ParseResult = { ok: true; value: Partial<FilamentBody> } | { ok: false; message: string }

// Validates a request body against the filament input fields. With
// `partial` (PATCH) any subset is accepted; otherwise all fields except
// `color` are required. Weights are rounded to gram integers.
export function parseFilamentBody(body: unknown, { partial }: { partial: boolean }): ParseResult {
  if (typeof body !== "object" || body === null || Array.isArray(body)) {
    return { ok: false, message: "Request body must be a JSON object" }
  }
  const input = body as Record<string, unknown>
  const value: Partial<FilamentBody> = {}

  for (const field of ["name", "manufacturer"] as const) {
    if (input[field] !== undefined) {
      if (typeof input[field] !== "string" || !(input[field] as string).trim()) {
        return { ok: false, message: `${field} must be a non-empty string` }
      }
      value[field] = (input[field] as string).trim()
    } else if (!partial) {
      return { ok: false, message: `${field} is required` }
    }
  }

  if (input.filamentType !== undefined) {
    if (typeof input.filamentType !== "string" || !FILAMENT_TYPES.includes(input.filamentType)) {
      return { ok: false, message: `filamentType must be one of: ${FILAMENT_TYPES.join(", ")}` }
    }
    value.filamentType = input.filamentType
  } else if (!partial) {
    return { ok: false, message: "filamentType is required" }
  }

  if (input.color !== undefined) {
    if (input.color !== null && typeof input.color !== "string") {
      return { ok: false, message: "color must be a string or null" }
    }
    value.color = typeof input.color === "string" && input.color.trim() ? input.color.trim() : null
  }

  if (input.spoolTypeId !== undefined) {
    if (typeof input.spoolTypeId !== "number" || !Number.isInteger(input.spoolTypeId) || input.spoolTypeId <= 0) {
      return { ok: false, message: "spoolTypeId must be a positive integer" }
    }
    value.spoolTypeId = input.spoolTypeId
  } else if (!partial) {
    return { ok: false, message: "spoolTypeId is required" }
  }

  const weightError = parseWeightField(input, "fullFilamentWeightGrams", { min: 1, partial }, value)
  if (weightError) return weightError
  const measuredError = parseWeightField(input, "measuredTotalWeightGrams", { min: 0, partial }, value)
  if (measuredError) return measuredError

  return { ok: true, value }
}

function parseWeightField(
  input: Record<string, unknown>,
  field: "fullFilamentWeightGrams" | "measuredTotalWeightGrams",
  { min, partial }: { min: number; partial: boolean },
  out: Partial<FilamentBody>,
): ParseResult | null {
  if (input[field] !== undefined) {
    if (typeof input[field] !== "number" || !Number.isFinite(input[field] as number)) {
      return { ok: false, message: `${field} must be a number (grams)` }
    }
    const grams = Math.round(input[field] as number)
    if (grams < min) {
      return { ok: false, message: `${field} must be at least ${min} g` }
    }
    out[field] = grams
  } else if (!partial) {
    return { ok: false, message: `${field} is required` }
  }
  return null
}
