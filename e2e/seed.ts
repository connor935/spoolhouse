// Resets and seeds the throwaway E2E database (never the shared dev DB).
// Run by e2e/serve.mjs before the app starts:  npx tsx e2e/seed.ts
import { randomUUID } from 'node:crypto';
import { rmSync } from 'node:fs';
import { hashPassword } from 'better-auth/crypto';
import { closeDb, db, runMigrations } from '../lib/db';
import { LOCAL_DATA_DIR, LOCAL_DB_PORT } from '../lib/db/local.mjs';
import {
  account,
  groupMembers,
  groups,
  lends,
  materials,
  notifications,
  spools,
  spoolTypes,
  user,
} from '../lib/db/schema';
import { isPortOpen, withLocalDb } from '../scripts/local-db.mjs';
import { E2E_PASSWORD, GROUP_NAME, users } from './data';

async function createUser(
  { email, name }: { email: string; name: string },
  role: 'admin' | 'user'
) {
  const id = randomUUID();
  const now = new Date();
  await db.insert(user).values({
    id,
    name,
    email,
    emailVerified: true,
    role,
    createdAt: now,
    updatedAt: now,
  });
  await db.insert(account).values({
    id: randomUUID(),
    accountId: id,
    providerId: 'credential',
    userId: id,
    password: await hashPassword(E2E_PASSWORD),
    createdAt: now,
    updatedAt: now,
  });
  return id;
}

async function seed() {
  const adminId = await createUser(users.admin, 'admin');
  const memberId = await createUser(users.member, 'user');

  // Catalog: approved entries plus pending requests for the admin's review
  // pills (2 materials, 1 spool type).
  const [spoolType] = await db
    .insert(spoolTypes)
    .values({
      manufacturer: 'E2E',
      name: 'E2E Spool',
      emptyWeightGrams: 250,
      status: 'approved',
      submittedById: adminId,
      reviewedById: adminId,
    })
    .returning({ id: spoolTypes.id });
  await db.insert(spoolTypes).values({
    manufacturer: 'E2E',
    name: 'Pending Spool',
    emptyWeightGrams: 200,
    status: 'pending',
    submittedById: memberId,
  });
  const [black, white] = await db
    .insert(materials)
    .values(
      [
        ['Black', 'PLA', '#1a1a1a'],
        ['White', 'PETG', '#f5f5f0'],
      ].map(([name, filamentType, color]) => ({
        manufacturer: 'E2E',
        name,
        filamentType,
        color,
        status: 'approved',
        submittedById: adminId,
        reviewedById: adminId,
      }))
    )
    .returning({ id: materials.id });
  await db.insert(materials).values(
    ['Pending One', 'Pending Two'].map((name) => ({
      manufacturer: 'E2E',
      name,
      filamentType: 'PLA',
      color: '#888888',
      status: 'pending',
      submittedById: memberId,
    }))
  );

  // Spools: the member has 2 in stock + 1 empty, the admin 1 in stock.
  const spool = (userId: string, materialId: string, left: number) => ({
    userId,
    materialId,
    spoolTypeId: spoolType.id,
    fullFilamentWeightGrams: 1000,
    measuredTotalWeightGrams: 250 + left,
  });
  const [memberSpool] = await db
    .insert(spools)
    .values([
      spool(memberId, black.id, 800),
      spool(memberId, white.id, 400),
      spool(memberId, white.id, 0),
      spool(adminId, black.id, 600),
    ])
    .returning({ id: spools.id });

  // The social spec's pair: the lender owns two spools, the borrower one.
  const lenderId = await createUser(users.lender, 'user');
  const borrowerId = await createUser(users.borrower, 'user');
  await db
    .insert(spools)
    .values([
      spool(lenderId, black.id, 700),
      spool(lenderId, white.id, 500),
      spool(borrowerId, white.id, 300),
    ]);

  // A group with both, sharing everything; the admin asked to borrow one of
  // the member's spools.
  const [group] = await db
    .insert(groups)
    .values({
      name: GROUP_NAME,
      ownerId: adminId,
      inviteCode: randomUUID().slice(0, 8),
    })
    .returning({ id: groups.id });
  await db.insert(groupMembers).values([
    { groupId: group.id, userId: adminId, role: 'owner', shareMode: 'all' },
    { groupId: group.id, userId: memberId, role: 'member', shareMode: 'all' },
  ]);
  const [lend] = await db
    .insert(lends)
    .values({
      filamentId: memberSpool.id,
      borrowerId: adminId,
      groupId: group.id,
      status: 'requested',
    })
    .returning({ id: lends.id });

  // The member has 3 unread notifications and 1 read one.
  const note = {
    userId: memberId,
    type: 'lend_requested',
    actorName: users.admin.name,
    filamentName: 'E2E Black',
    groupName: GROUP_NAME,
    lendId: lend.id,
  };
  await db
    .insert(notifications)
    .values([note, note, note, { ...note, readAt: new Date() }]);
}

async function main() {
  // Guard: this wipes a data directory. Only ever the E2E one, on its own port.
  if (!LOCAL_DATA_DIR.includes('e2e') || LOCAL_DB_PORT === 5433) {
    throw new Error(
      `Refusing to reset ${LOCAL_DATA_DIR} on port ${LOCAL_DB_PORT}: run via e2e/serve.mjs (DATABASE_PATH=data/pglite-e2e, DEV_DB_PORT=5434).`
    );
  }
  if (process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL is set; the E2E seed only runs on PGlite.');
  }
  if (await isPortOpen()) {
    throw new Error(
      `Port ${LOCAL_DB_PORT} is already served; stop the old E2E database first.`
    );
  }
  rmSync(LOCAL_DATA_DIR, { recursive: true, force: true });
  await withLocalDb(async () => {
    await runMigrations();
    await seed();
    await closeDb();
  });
  console.log(`[e2e] seeded ${LOCAL_DATA_DIR}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
