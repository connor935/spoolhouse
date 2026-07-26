import 'server-only';

import { inArray } from 'drizzle-orm';
import { asc, eq } from 'drizzle-orm';
import { db } from '@/lib/db';
import { materialProperties, properties, user } from '@/lib/db/schema';

// A material's datasheet value joined with its definition, for display.
export type MaterialPropertyView = {
  id: string;
  propertyId: string;
  key: string;
  name: string;
  unit: string | null;
  value: string;
  verified: boolean;
  submittedByName: string | null;
};

// Datasheet values for a set of materials, grouped by material id and ordered
// by property name. Shared by the dashboard (app/page.tsx) and the REST API
// (app/api/v1/materials). Returns an empty map for an empty id list.
export async function getPropertiesForMaterials(
  materialIds: string[]
): Promise<Record<string, MaterialPropertyView[]>> {
  const byMaterial: Record<string, MaterialPropertyView[]> = {};
  if (materialIds.length === 0) return byMaterial;

  const rows = await db
    .select({
      id: materialProperties.id,
      materialId: materialProperties.materialId,
      propertyId: properties.id,
      key: properties.key,
      name: properties.name,
      unit: properties.unit,
      value: materialProperties.value,
      verified: materialProperties.verified,
      submittedByName: user.name,
    })
    .from(materialProperties)
    .innerJoin(properties, eq(materialProperties.propertyId, properties.id))
    .leftJoin(user, eq(materialProperties.submittedById, user.id))
    .where(inArray(materialProperties.materialId, materialIds))
    .orderBy(asc(properties.name));

  for (const row of rows) {
    const { materialId, ...view } = row;
    (byMaterial[materialId] ??= []).push(view);
  }
  return byMaterial;
}

// Deletes all value rows for a material. Called from the material-delete path
// (lib/catalog.ts `onRemove`) because the ON DELETE CASCADE FK is inert at
// runtime (see lib/db/index.ts). Server-only helper — NOT a server action, so
// it can't be invoked directly by a client.
export async function deleteMaterialPropertiesFor(materialId: string) {
  await db
    .delete(materialProperties)
    .where(eq(materialProperties.materialId, materialId));
}
