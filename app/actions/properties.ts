'use server';

import { asc, count, eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { db } from '@/lib/db';
import {
  materialProperties,
  properties,
  type Property,
} from '@/lib/db/schema';
import { requireAdmin, requireUser } from '@/lib/auth-session';
import { assertMaterialUsable } from '@/lib/material-usable';
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

// Edits name/unit/description only — `key` is immutable (migrations and the
// importer reference definitions by key).
export async function updatePropertyDefinition(
  id: string,
  input: Omit<PropertyDefinitionInput, 'key'>
) {
  await requireAdmin();
  const values = parseOrThrow(propertyDefinitionEditSchema, input);
  await db
    .update(properties)
    .set({ ...values, updatedAt: new Date() })
    .where(eq(properties.id, id));
  revalidateDefinitions();
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
    .select({ id: properties.id })
    .from(properties)
    .where(eq(properties.id, propertyId));
  if (!property) throw new Error('Unknown property');

  const verified = user.role === 'admin';
  await db
    .insert(materialProperties)
    .values({ materialId, propertyId, value, verified, submittedById: user.id })
    .onConflictDoUpdate({
      target: [materialProperties.materialId, materialProperties.propertyId],
      set: { value, verified, submittedById: user.id, updatedAt: new Date() },
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
