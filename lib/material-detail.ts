import 'server-only';

import { and, count, eq, or } from 'drizzle-orm';
import { getMyGroups } from '@/app/actions/groups';
import { db } from '@/lib/db';
import { materials, spools, user, type Material } from '@/lib/db/schema';
import { getSharedFilaments, type SharedSpool } from '@/lib/sharing';

// Read side of /materials/[id]. Visibility is decided in the WHERE clause, so
// a material the viewer may not see is indistinguishable from a missing one.

export type MaterialDetailRecord = {
  material: Material;
  submitterName: string | null;
  /** Spools on it across all users — the admin delete guard. */
  spoolCount: number;
};

export async function getVisibleMaterial(
  id: string,
  viewer: { id: string; role?: string | null }
): Promise<MaterialDetailRecord | null> {
  const visible =
    viewer.role === 'admin'
      ? undefined
      : or(
          eq(materials.status, 'approved'),
          eq(materials.submittedById, viewer.id)
        );
  const [row] = await db
    .select({ material: materials, submitterName: user.name })
    .from(materials)
    .leftJoin(user, eq(materials.submittedById, user.id))
    .where(and(eq(materials.id, id), visible));
  if (!row) return null;
  const [{ value: spoolCount }] = await db
    .select({ value: count() })
    .from(spools)
    .where(eq(spools.materialId, id));
  return { ...row, spoolCount };
}

export type MaterialGroupSpool = {
  groupId: string;
  groupName: string;
  /** 1-based, oldest first among the owner's spools of it shared in this group. */
  number: number;
  spool: SharedSpool;
};

// Other members' spools of this material, as pooled by each of the viewer's
// groups (getSharedFilaments resolves share modes and drops empty spools).
// A spool shared in two groups appears once per group: lends are per group.
export async function getMaterialGroupStock(
  materialId: string,
  viewerId: string
): Promise<MaterialGroupSpool[]> {
  const myGroups = await getMyGroups();
  const perGroup = await Promise.all(
    myGroups.map(async ({ group }) => {
      const stock = (await getSharedFilaments(group.id))
        .filter((s) => s.materialId === materialId && s.ownerId !== viewerId)
        .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
      const seen = new Map<string, number>();
      return stock.map((spool) => {
        const number = (seen.get(spool.ownerId) ?? 0) + 1;
        seen.set(spool.ownerId, number);
        return { groupId: group.id, groupName: group.name, number, spool };
      });
    })
  );
  return perGroup.flat();
}
