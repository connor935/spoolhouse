import { sql } from 'drizzle-orm';
import {
  integer,
  real,
  sqliteTable,
  text,
  unique,
} from 'drizzle-orm/sqlite-core';
import { user } from './auth-schema';

export * from './auth-schema';

// Global spool-type catalog: admin-curated, users can submit requests.
// A pending type is immediately usable by its submitter, visible to others
// only once approved.
export const spoolTypes = sqliteTable('spool_types', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  manufacturer: text('manufacturer').notNull(),
  name: text('name').notNull(),
  // Weight of the bare, empty spool (g)
  emptyWeightGrams: integer('empty_weight_grams').notNull(),
  status: text('status').notNull().default('pending'), // approved | pending | rejected
  // Stable identity for entries seeded from SpoolmanDB (import idempotence).
  // NULL for user/admin-created entries. See scripts/import-spoolmandb.ts.
  externalKey: text('external_key').unique(),
  submittedById: text('submitted_by_id').references(() => user.id, {
    onDelete: 'set null',
  }),
  reviewedById: text('reviewed_by_id').references(() => user.id, {
    onDelete: 'set null',
  }),
  createdAt: integer('created_at', { mode: 'timestamp' })
    .notNull()
    .default(sql`(unixepoch())`),
  updatedAt: integer('updated_at', { mode: 'timestamp' })
    .notNull()
    .default(sql`(unixepoch())`),
});

// Global material catalog: curated exactly like spool types — users request,
// admin approves; a pending material is immediately usable by its submitter.
// Many users' spools can reference the same material.
export const materials = sqliteTable('materials', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  manufacturer: text('manufacturer').notNull(),
  name: text('name').notNull(),
  filamentType: text('filament_type').notNull(),
  color: text('color'),
  status: text('status').notNull().default('pending'), // approved | pending | rejected
  submittedById: text('submitted_by_id').references(() => user.id, {
    onDelete: 'set null',
  }),
  reviewedById: text('reviewed_by_id').references(() => user.id, {
    onDelete: 'set null',
  }),
  // Stable identity for entries seeded from SpoolmanDB (import idempotence).
  // NULL for user/admin-created entries. See scripts/import-spoolmandb.ts.
  externalKey: text('external_key').unique(),
  // Extra reference data seeded from SpoolmanDB (data-only for now, no UI yet).
  // All nullable; on re-import backfilled only where NULL (never overwritten).
  densityGCm3: real('density_g_cm3'),
  diametersMm: text('diameters_mm'), // comma-joined, e.g. "1.75" or "1.75,2.85"
  extruderTempMinC: integer('extruder_temp_min_c'),
  extruderTempMaxC: integer('extruder_temp_max_c'),
  bedTempMinC: integer('bed_temp_min_c'),
  bedTempMaxC: integer('bed_temp_max_c'),
  createdAt: integer('created_at', { mode: 'timestamp' })
    .notNull()
    .default(sql`(unixepoch())`),
  updatedAt: integer('updated_at', { mode: 'timestamp' })
    .notNull()
    .default(sql`(unixepoch())`),
});

// A physical spool of a material. DB table name stays "filaments" (SQLite
// table renames fight drizzle-kit's interactive prompts); TS calls it spools.
export const spools = sqliteTable('filaments', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  userId: text('user_id')
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
  materialId: integer('material_id')
    .notNull()
    .references(() => materials.id),
  // Empty-spool weight comes from the referenced spool type
  spoolTypeId: integer('spool_type_id')
    .notNull()
    .references(() => spoolTypes.id),
  // Nominal amount of filament on a full spool (g) - used for % remaining
  fullFilamentWeightGrams: integer('full_filament_weight_grams').notNull(),
  // Last measured total weight of spool + filament (g) - what you put on the scale
  measuredTotalWeightGrams: integer('measured_total_weight_grams').notNull(),
  // Optional NFC tag id (e.g. Bambu tray UID, hex) so an external client / scale
  // can register-or-refresh this spool by its tag. Unique per user (enforced in SQL).
  tagUid: text('tag_uid'),
  createdAt: integer('created_at', { mode: 'timestamp' })
    .notNull()
    .default(sql`(unixepoch())`),
  updatedAt: integer('updated_at', { mode: 'timestamp' })
    .notNull()
    .default(sql`(unixepoch())`),
});

// Long-lived bearer tokens for the external REST API (/api/v1). Only the
// SHA-256 hash is stored; the plaintext is shown once at creation on /account.
export const apiTokens = sqliteTable('api_tokens', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  userId: text('user_id')
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  tokenHash: text('token_hash').notNull().unique(),
  // First characters of the plaintext token, for display only (e.g. "sph_a1b2c3d4")
  tokenPrefix: text('token_prefix').notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' })
    .notNull()
    .default(sql`(unixepoch())`),
  lastUsedAt: integer('last_used_at', { mode: 'timestamp' }),
});

export type ApiToken = typeof apiTokens.$inferSelect;
export type Spool = typeof spools.$inferSelect;
export type NewSpool = typeof spools.$inferInsert;
export type Material = typeof materials.$inferSelect;
export type NewMaterial = typeof materials.$inferInsert;
export type SpoolType = typeof spoolTypes.$inferSelect;
export type NewSpoolType = typeof spoolTypes.$inferInsert;

// Invite-only groups of nearby users that pool their (selectively) shared
// spools into a browsable group stock — see .claude/epic-4.md.
export const groups = sqliteTable('groups', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  ownerId: text('owner_id')
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
  // Single reusable, rotatable invite code (Discord-style)
  inviteCode: text('invite_code').notNull().unique(),
  createdAt: integer('created_at', { mode: 'timestamp' })
    .notNull()
    .default(sql`(unixepoch())`),
  updatedAt: integer('updated_at', { mode: 'timestamp' })
    .notNull()
    .default(sql`(unixepoch())`),
});

export const groupMembers = sqliteTable(
  'group_members',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    groupId: integer('group_id')
      .notNull()
      .references(() => groups.id, { onDelete: 'cascade' }),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    role: text('role').notNull().default('member'), // owner | member
    // Default 'all' on join (Q: decided) — all/whitelist/blacklist, see filamentShareOverrides
    shareMode: text('share_mode').notNull().default('all'), // all | whitelist | blacklist
    joinedAt: integer('joined_at', { mode: 'timestamp' })
      .notNull()
      .default(sql`(unixepoch())`),
  },
  (table) => [unique().on(table.groupId, table.userId)]
);

// Per-member override list at MATERIAL granularity ("my spools of this
// material"). Meaning depends on the member's shareMode:
// whitelist -> these ARE shared; blacklist -> these are EXCLUDED.
export const filamentShareOverrides = sqliteTable(
  'filament_share_overrides',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    groupMemberId: integer('group_member_id')
      .notNull()
      .references(() => groupMembers.id, { onDelete: 'cascade' }),
    materialId: integer('material_id')
      .notNull()
      .references(() => materials.id, { onDelete: 'cascade' }),
  },
  (table) => [unique().on(table.groupMemberId, table.materialId)]
);

export const lends = sqliteTable('lends', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  // References a physical spool (row in the "filaments" table)
  filamentId: integer('filament_id')
    .notNull()
    .references(() => spools.id, { onDelete: 'cascade' }),
  borrowerId: text('borrower_id')
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
  groupId: integer('group_id')
    .notNull()
    .references(() => groups.id, { onDelete: 'cascade' }),
  status: text('status').notNull().default('requested'), // requested | active | declined | returned
  requestedAt: integer('requested_at', { mode: 'timestamp' })
    .notNull()
    .default(sql`(unixepoch())`),
  respondedAt: integer('responded_at', { mode: 'timestamp' }),
  returnedAt: integer('returned_at', { mode: 'timestamp' }),
  createdAt: integer('created_at', { mode: 'timestamp' })
    .notNull()
    .default(sql`(unixepoch())`),
  updatedAt: integer('updated_at', { mode: 'timestamp' })
    .notNull()
    .default(sql`(unixepoch())`),
});

// In-app notifications (bell + /notifications). Actor/filament/group names are
// denormalized snapshots so notifications survive deletions of their sources.
export const notifications = sqliteTable('notifications', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  // Recipient
  userId: text('user_id')
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
  // lend_requested | lend_approved | lend_declined | lend_returned | lend_request_cancelled
  type: text('type').notNull(),
  actorName: text('actor_name').notNull(),
  filamentName: text('filament_name').notNull(),
  groupName: text('group_name').notNull(),
  lendId: integer('lend_id'),
  readAt: integer('read_at', { mode: 'timestamp' }),
  createdAt: integer('created_at', { mode: 'timestamp' })
    .notNull()
    .default(sql`(unixepoch())`),
});

export type Group = typeof groups.$inferSelect;
export type NewGroup = typeof groups.$inferInsert;
export type GroupMember = typeof groupMembers.$inferSelect;
export type NewGroupMember = typeof groupMembers.$inferInsert;
export type FilamentShareOverride = typeof filamentShareOverrides.$inferSelect;
export type Lend = typeof lends.$inferSelect;
export type NewLend = typeof lends.$inferInsert;
export type Notification = typeof notifications.$inferSelect;
export type NewNotification = typeof notifications.$inferInsert;
