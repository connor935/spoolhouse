import { randomUUID } from 'node:crypto';
import { sql } from 'drizzle-orm';
import {
  integer,
  sqliteTable,
  text,
  unique,
} from 'drizzle-orm/sqlite-core';
import { user } from './auth-schema';

// All app-table primary keys are random UUIDs (not sequential integers): they
// surface in the REST API (/api/v1/spools/:id etc.) and URLs, so unguessable
// ids avoid enumeration/leaking counts. `user`/auth tables keep better-auth's
// own (already random) ids. Generated in JS via $defaultFn on insert.

export * from './auth-schema';

// Global spool-type catalog: admin-curated, users can submit requests.
// A pending type is immediately usable by its submitter, visible to others
// only once approved.
export const spoolTypes = sqliteTable('spool_types', {
  id: text('id')
    .primaryKey()
    .$defaultFn(() => randomUUID()),
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
  id: text('id')
    .primaryKey()
    .$defaultFn(() => randomUUID()),
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
  // Datasheet reference data (density, diameters, temps, and anything added
  // later) lives in the generic material_properties table below, not here.
  createdAt: integer('created_at', { mode: 'timestamp' })
    .notNull()
    .default(sql`(unixepoch())`),
  updatedAt: integer('updated_at', { mode: 'timestamp' })
    .notNull()
    .default(sql`(unixepoch())`),
});

// Admin-curated property definitions (small stable vocabulary, no review
// flow). `key` is a stable machine identifier ('density', 'extruder_temp', …)
// used by migrations and the SpoolmanDB importer — set at creation, never
// edited afterwards.
export const properties = sqliteTable('properties', {
  id: text('id')
    .primaryKey()
    .$defaultFn(() => randomUUID()),
  key: text('key').notNull().unique(),
  name: text('name').notNull(), // display label, e.g. "Tensile strength"
  unit: text('unit'), // e.g. "MPa", "°C"; NULL for unitless
  description: text('description'),
  createdAt: integer('created_at', { mode: 'timestamp' })
    .notNull()
    .default(sql`(unixepoch())`),
  updatedAt: integer('updated_at', { mode: 'timestamp' })
    .notNull()
    .default(sql`(unixepoch())`),
});

// Wiki-style datasheet values: material × property → free-text value (unit
// lives on the definition). Any logged-in user may add/edit; a non-admin
// edit resets `verified` until an admin verifies it. Import/migration-seeded
// rows are verified with submittedById NULL.
export const materialProperties = sqliteTable(
  'material_properties',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => randomUUID()),
    materialId: text('material_id')
      .notNull()
      .references(() => materials.id, { onDelete: 'cascade' }),
    propertyId: text('property_id')
      .notNull()
      .references(() => properties.id, { onDelete: 'cascade' }),
    value: text('value').notNull(),
    verified: integer('verified', { mode: 'boolean' }).notNull().default(false),
    // Who last set the value; NULL for seeded rows or deleted users.
    submittedById: text('submitted_by_id').references(() => user.id, {
      onDelete: 'set null',
    }),
    createdAt: integer('created_at', { mode: 'timestamp' })
      .notNull()
      .default(sql`(unixepoch())`),
    updatedAt: integer('updated_at', { mode: 'timestamp' })
      .notNull()
      .default(sql`(unixepoch())`),
  },
  (t) => [unique().on(t.materialId, t.propertyId)]
);

// A physical spool of a material. DB table name stays "filaments" (SQLite
// table renames fight drizzle-kit's interactive prompts); TS calls it spools.
export const spools = sqliteTable('filaments', {
  id: text('id')
    .primaryKey()
    .$defaultFn(() => randomUUID()),
  userId: text('user_id')
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
  materialId: text('material_id')
    .notNull()
    .references(() => materials.id),
  // Empty-spool weight comes from the referenced spool type
  spoolTypeId: text('spool_type_id')
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
  id: text('id')
    .primaryKey()
    .$defaultFn(() => randomUUID()),
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
export type Property = typeof properties.$inferSelect;
export type NewProperty = typeof properties.$inferInsert;
export type MaterialProperty = typeof materialProperties.$inferSelect;
export type NewMaterialProperty = typeof materialProperties.$inferInsert;

// Invite-only groups of nearby users that pool their (selectively) shared
// spools into a browsable group stock — see .claude/epic-4.md.
export const groups = sqliteTable('groups', {
  id: text('id')
    .primaryKey()
    .$defaultFn(() => randomUUID()),
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
    id: text('id')
    .primaryKey()
    .$defaultFn(() => randomUUID()),
    groupId: text('group_id')
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
    id: text('id')
    .primaryKey()
    .$defaultFn(() => randomUUID()),
    groupMemberId: text('group_member_id')
      .notNull()
      .references(() => groupMembers.id, { onDelete: 'cascade' }),
    materialId: text('material_id')
      .notNull()
      .references(() => materials.id, { onDelete: 'cascade' }),
  },
  (table) => [unique().on(table.groupMemberId, table.materialId)]
);

export const lends = sqliteTable('lends', {
  id: text('id')
    .primaryKey()
    .$defaultFn(() => randomUUID()),
  // References a physical spool (row in the "filaments" table)
  filamentId: text('filament_id')
    .notNull()
    .references(() => spools.id, { onDelete: 'cascade' }),
  borrowerId: text('borrower_id')
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
  groupId: text('group_id')
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
  id: text('id')
    .primaryKey()
    .$defaultFn(() => randomUUID()),
  // Recipient
  userId: text('user_id')
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
  // lend_requested | lend_approved | lend_declined | lend_returned | lend_request_cancelled
  type: text('type').notNull(),
  actorName: text('actor_name').notNull(),
  filamentName: text('filament_name').notNull(),
  groupName: text('group_name').notNull(),
  lendId: text('lend_id'),
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
