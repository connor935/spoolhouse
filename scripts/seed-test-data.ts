// One-off dev seed: a second test user, spool types, filaments, a group, and
// an active lend. Safe to re-run (skips work if test data already exists).
// Usage: npx tsx scripts/seed-test-data.ts
import { randomUUID } from 'node:crypto';
import { eq } from 'drizzle-orm';
import { hashPassword } from 'better-auth/crypto';
import { db } from '../lib/db';
import {
  account,
  groupMembers,
  groups,
  lends,
  materials,
  spools,
  spoolTypes,
  user,
} from '../lib/db/schema';

const TEST_PASSWORD = 'testuser12345';

async function ensureUser(email: string, name: string) {
  const normalizedEmail = email.toLowerCase();
  const existing = await db
    .select()
    .from(user)
    .where(eq(user.email, normalizedEmail));
  if (existing.length > 0) return existing[0].id;

  const userId = randomUUID();
  const now = new Date();
  await db.insert(user).values({
    id: userId,
    name,
    email: normalizedEmail,
    emailVerified: true,
    role: 'user',
    createdAt: now,
    updatedAt: now,
  });
  await db.insert(account).values({
    id: randomUUID(),
    accountId: userId,
    providerId: 'credential',
    userId,
    password: await hashPassword(TEST_PASSWORD),
    createdAt: now,
    updatedAt: now,
  });
  return userId;
}

async function main() {
  const admin = await db.select().from(user).where(eq(user.role, 'admin'));
  if (admin.length === 0) {
    console.error(
      'No admin account found — run `npm run admin:create -- <email> <name>` first.'
    );
    process.exit(1);
  }
  const adminId = admin[0].id;

  const bobId = await ensureUser('bob@example.com', 'Bob Borrower');
  console.log(`Test user ready: bob@example.com / ${TEST_PASSWORD}`);

  // Spool types (global catalog)
  const spoolTypeDefs = [
    {
      manufacturer: 'Prusament',
      name: 'Prusament Spool',
      emptyWeightGrams: 250,
    },
    {
      manufacturer: 'eSun',
      name: 'eSun Standard Spool',
      emptyWeightGrams: 200,
    },
    {
      manufacturer: 'Polymaker',
      name: 'Polymaker PolyBox',
      emptyWeightGrams: 220,
    },
  ] as const;

  const spoolTypeIds: string[] = [];
  for (const def of spoolTypeDefs) {
    const existing = await db
      .select()
      .from(spoolTypes)
      .where(eq(spoolTypes.name, def.name));
    if (existing.length > 0) {
      spoolTypeIds.push(existing[0].id);
      continue;
    }
    const [inserted] = await db
      .insert(spoolTypes)
      .values({
        ...def,
        status: 'approved',
        submittedById: adminId,
        reviewedById: adminId,
      })
      .returning({ id: spoolTypes.id });
    spoolTypeIds.push(inserted.id);
  }
  console.log(
    `Spool types ready: ${spoolTypeDefs.map((d) => d.name).join(', ')}`
  );

  // Materials (global catalog) + spools for the admin user
  const materialDefs = [
    {
      manufacturer: 'Prusament',
      name: 'Galaxy Black',
      filamentType: 'PLA',
      color: '#1a1a1a',
    },
    {
      manufacturer: 'eSun',
      name: 'Signal White',
      filamentType: 'PETG',
      color: '#f5f5f0',
    },
    {
      manufacturer: 'Polymaker',
      name: 'Sunset Orange',
      filamentType: 'ASA',
      color: '#e0651a',
    },
    {
      manufacturer: 'eSun',
      name: 'Empty Test Grey',
      filamentType: 'PLA',
      color: '#888888',
    },
  ] as const;

  const materialIds: string[] = [];
  for (const def of materialDefs) {
    const existing = await db
      .select()
      .from(materials)
      .where(eq(materials.name, def.name));
    if (existing.length > 0) {
      materialIds.push(existing[0].id);
      continue;
    }
    const [inserted] = await db
      .insert(materials)
      .values({
        ...def,
        status: 'approved',
        submittedById: adminId,
        reviewedById: adminId,
      })
      .returning({ id: materials.id });
    materialIds.push(inserted.id);
  }
  console.log(`Materials ready: ${materialDefs.map((d) => d.name).join(', ')}`);

  const existingSpools = await db
    .select()
    .from(spools)
    .where(eq(spools.userId, adminId));
  let spoolIds: string[] = existingSpools.map((f) => f.id);
  if (existingSpools.length === 0) {
    const spoolDefs = [
      {
        materialId: materialIds[0],
        spoolTypeId: spoolTypeIds[0],
        fullFilamentWeightGrams: 1000,
        measuredTotalWeightGrams: 950,
      },
      {
        materialId: materialIds[1],
        spoolTypeId: spoolTypeIds[1],
        fullFilamentWeightGrams: 1000,
        measuredTotalWeightGrams: 640,
      },
      {
        materialId: materialIds[2],
        spoolTypeId: spoolTypeIds[2],
        fullFilamentWeightGrams: 1000,
        measuredTotalWeightGrams: 220,
      },
      {
        materialId: materialIds[3],
        spoolTypeId: spoolTypeIds[1],
        fullFilamentWeightGrams: 1000,
        measuredTotalWeightGrams: 200,
      }, // == empty weight -> 0g left
    ];
    const inserted = await db
      .insert(spools)
      .values(spoolDefs.map((f) => ({ ...f, userId: adminId })))
      .returning({ id: spools.id });
    spoolIds = inserted.map((r) => r.id);
    console.log('Spools created (one per material, incl. an empty one)');
  } else {
    console.log('Spools already exist for admin user, skipping.');
  }

  // Group with both users, sharing everything
  let groupId: string;
  const existingGroup = await db
    .select()
    .from(groups)
    .where(eq(groups.name, 'Test Makerspace'));
  if (existingGroup.length > 0) {
    groupId = existingGroup[0].id;
  } else {
    const [group] = await db
      .insert(groups)
      .values({
        name: 'Test Makerspace',
        ownerId: adminId,
        inviteCode: randomUUID().slice(0, 8),
      })
      .returning({ id: groups.id });
    groupId = group.id;
    console.log(
      `Group created: Test Makerspace (invite code visible on /groups)`
    );
  }

  const memberDefs = [
    { userId: adminId, role: 'owner' as const },
    { userId: bobId, role: 'member' as const },
  ];
  const memberIds: Record<string, string> = {};
  for (const m of memberDefs) {
    const existing = await db
      .select()
      .from(groupMembers)
      .where(eq(groupMembers.groupId, groupId));
    const found = existing.find((gm) => gm.userId === m.userId);
    if (found) {
      memberIds[m.userId] = found.id;
      continue;
    }
    const [inserted] = await db
      .insert(groupMembers)
      .values({ groupId, userId: m.userId, role: m.role, shareMode: 'all' })
      .returning({ id: groupMembers.id });
    memberIds[m.userId] = inserted.id;
  }

  // An active lend: bob borrowing the admin's PETG spool
  const existingLend = await db
    .select()
    .from(lends)
    .where(eq(lends.groupId, groupId));
  if (existingLend.length === 0 && spoolIds.length > 1) {
    await db.insert(lends).values({
      filamentId: spoolIds[1],
      borrowerId: bobId,
      groupId,
      status: 'active',
      respondedAt: new Date(),
    });
    console.log('Active lend created: Bob borrowing Signal White PETG');
  }

  console.log('\nSeed complete.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
