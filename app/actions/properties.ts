'use server';

import { and, asc, count, eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { db } from '@/lib/db';
import { materialProperties, properties, type Property } from '@/lib/db/schema';
import { requireAdmin, requireUser } from '@/lib/auth-session';
import { assertMaterialUsable } from '@/lib/material-usable';
import {
  isPropertyValueType,
  normalizePropertyValue,
  typeChangeRefusal,
  type PropertyValueType,
} from '@/lib/property-value';
import {
  materialPropertyValueSchema,
  parseOrThrow,
  propertyDefinitionEditSchema,
  propertyDefinitionSchema,
} from '@/lib/schemas';

type PropertyDefinitionInput = {
  key: string;
  name: string;
  unit?: string | null;
  description?: string | null;
  // What shape values take, and therefore how they are validated/normalised.
  valueType: PropertyValueType;
};

function revalidateDefinitions() {
  revalidatePath('/admin/properties');
  revalidateValues();
}

// Property values surface on the dashboard, the materials catalog and the
// admin materials view — refresh all three after any change.
function revalidateValues() {
  revalidatePath('/');
  revalidatePath('/materials');
  revalidatePath('/admin/materials');
}

// Stored as plain text; anything unrecognised behaves as free text, which is
// the harmless default (text values are never range-filtered).
function asValueType(stored: string): PropertyValueType {
  return isPropertyValueType(stored) ? stored : 'text';
}

// --- Definitions (admin-curated vocabulary) ---

export async function getPropertyDefinitions(): Promise<Property[]> {
  await requireUser();
  return db.select().from(properties).orderBy(asc(properties.name));
}

export type PropertyWithUsage = Property & { valueCount: number };

// Full definition list for the admin page, incl. how many material values
// reference each (governs whether it can be deleted).
export async function getPropertyDefinitionsForAdmin(): Promise<
  PropertyWithUsage[]
> {
  await requireAdmin();
  const rows = await db
    .select({ property: properties, valueCount: count(materialProperties.id) })
    .from(properties)
    .leftJoin(
      materialProperties,
      eq(materialProperties.propertyId, properties.id)
    )
    .groupBy(properties.id)
    .orderBy(asc(properties.name));
  return rows.map((r) => ({ ...r.property, valueCount: r.valueCount }));
}

export async function createPropertyDefinition(input: PropertyDefinitionInput) {
  await requireAdmin();
  const values = parseOrThrow(propertyDefinitionSchema, input);
  await db.insert(properties).values(values);
  revalidateDefinitions();
}

// Edits name/unit/description/type — `key` is immutable (migrations and the
// importer reference definitions by key). A type change some existing value
// no longer fits is refused with a message rather than thrown: production
// builds mask thrown server-action errors, and the admin needs the count.
export async function updatePropertyDefinition(
  id: string,
  input: Omit<PropertyDefinitionInput, 'key'>
): Promise<{ ok: true } | { ok: false; message: string }> {
  await requireAdmin();
  const values = parseOrThrow(propertyDefinitionEditSchema, input);

  const [existing] = await db
    .select({ valueType: properties.valueType })
    .from(properties)
    .where(eq(properties.id, id));
  if (existing && values.valueType !== existing.valueType) {
    const rows = await db
      .select({ value: materialProperties.value })
      .from(materialProperties)
      .where(eq(materialProperties.propertyId, id));
    const type = asValueType(values.valueType);
    const refusal = typeChangeRefusal(
      type,
      rows.map((r) => r.value)
    );
    if (refusal) return { ok: false, message: refusal };
    // Re-normalise so stored values and bounds match the new type — a range
    // becoming text must drop its bounds, and text becoming a number must gain
    // them. One statement per *distinct* value: a property with thousands of
    // rows usually has a few dozen different values.
    for (const value of new Set(rows.map((r) => r.value))) {
      const normalized = normalizePropertyValue(type, value);
      if (!normalized.ok) continue;
      await db
        .update(materialProperties)
        .set({
          value: normalized.value,
          valueMin: normalized.min,
          valueMax: normalized.max,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(materialProperties.propertyId, id),
            eq(materialProperties.value, value)
          )
        );
    }
  }

  await db
    .update(properties)
    .set({ ...values, updatedAt: new Date() })
    .where(eq(properties.id, id));
  revalidateDefinitions();
  return { ok: true };
}

// Admin-only, and only when no material references it (FK cascade is inert at
// runtime — see lib/db/index.ts — so this guard is what prevents orphans).
export async function deletePropertyDefinition(id: string) {
  await requireAdmin();
  const [usage] = await db
    .select({ count: count() })
    .from(materialProperties)
    .where(eq(materialProperties.propertyId, id));
  if (usage.count > 0)
    throw new Error('Property is in use by existing material values');
  await db.delete(properties).where(eq(properties.id, id));
  revalidateDefinitions();
}

// --- Values (wiki-style, any logged-in user) ---

type MaterialPropertyValueInput = {
  materialId: string;
  propertyId: string;
  value: string;
};

// Any logged-in user may set a value on a material they can use (approved, or
// their own pending). Admin edits are verified immediately; non-admin edits
// (re)set `verified = false` until an admin verifies.
export async function setMaterialProperty(input: MaterialPropertyValueInput) {
  const user = await requireUser();
  const { materialId, propertyId, value } = parseOrThrow(
    materialPropertyValueSchema,
    input
  );
  await assertMaterialUsable(materialId, user.id);

  const [property] = await db
    .select({ id: properties.id, valueType: properties.valueType })
    .from(properties)
    .where(eq(properties.id, propertyId));
  if (!property) throw new Error('Unknown property');

  // The definition's type decides what the value may look like and what it is
  // stored as: "1,24" on a number becomes "1.24" rather than the range 1–24,
  // which is what a decimal comma used to turn into. The numeric span comes
  // from the same call — the catalog's range filter reads it in SQL, so a value
  // written without it would silently stop matching.
  const normalized = normalizePropertyValue(
    asValueType(property.valueType),
    value
  );
  if (!normalized.ok) throw new Error(normalized.message);

  const verified = user.role === 'admin';
  const columns = {
    value: normalized.value,
    valueMin: normalized.min,
    valueMax: normalized.max,
  };
  await db
    .insert(materialProperties)
    .values({
      materialId,
      propertyId,
      ...columns,
      verified,
      submittedById: user.id,
    })
    .onConflictDoUpdate({
      target: [materialProperties.materialId, materialProperties.propertyId],
      set: {
        ...columns,
        verified,
        submittedById: user.id,
        updatedAt: new Date(),
      },
    });
  revalidateValues();
}

export async function verifyMaterialProperty(id: string) {
  await requireAdmin();
  await db
    .update(materialProperties)
    .set({ verified: true, updatedAt: new Date() })
    .where(eq(materialProperties.id, id));
  revalidateValues();
}

export async function deleteMaterialProperty(id: string) {
  await requireAdmin();
  await db.delete(materialProperties).where(eq(materialProperties.id, id));
  revalidateValues();
}
