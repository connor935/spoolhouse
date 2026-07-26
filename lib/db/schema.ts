import { randomUUID } from 'node:crypto';
import {
  boolean,
  integer,
  pgTable,
  text,
  timestamp,
  unique,
} from 'drizzle-orm/pg-core';
import { user } from './auth-schema';

// All app-table primary keys are random UUIDs (not sequential integers): they
// surface in the REST API (/api/v1/spools/:id etc.) and URLs, so unguessable
// ids avoid enumeration/leaking counts. `user`/auth tables keep better-auth's
// own (already random) ids. Generated in JS via $defaultFn on insert.

export * from './auth-schema';

// Global spool-type catalog: admin-curated, users can submit requests.
// A pending type is immediately usable by its submitter, visible to others
// only once approved.
export const spoolTypes = pgTable('spool_types', {
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
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
});

// Global material catalog: curated exactly like spool types — users request,
// admin approves; a pending material is immediately usable by its submitter.
// Many users' spools can reference the same material.
export const materials = pgTable('materials', {
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
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
});

// Admin-curated property definitions (small stable vocabulary, no review
// flow). `key` is a stable machine identifier ('density', 'extruder_temp', …)
// used by migrations and the SpoolmanDB importer — set at creation, never
// edited afterwards.
export const properties = pgTable('properties', {
  id: text('id')
    .primaryKey()
    .$defaultFn(() => randomUUID()),
  key: text('key').notNull().unique(),
  name: text('name').notNull(), // display label, e.g. "Tensile strength"
  unit: text('unit'), // e.g. "MPa", "°C"; NULL for unitless
  description: text('description'),
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
});

// Wiki-style datasheet values: material × property → free-text value (unit
// lives on the definition). Any logged-in user may add/edit; a non-admin
// edit resets `verified` until an admin verifies it. Import/migration-seeded
// rows are verified with submittedById NULL.
export const materialProperties = pgTable(
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
    verified: boolean('verified').notNull().default(false),
    // Who last set the value; NULL for seeded rows or deleted users.
    submittedById: text('submitted_by_id').references(() => user.id, {
      onDelete: 'set null',
    }),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [unique().on(t.materialId, t.propertyId)]
);

// A physical spool of a material. DB table name stays "filaments" (renaming it
// would churn migrations and the REST API's history for no gain); TS calls it
// spools.
export const spools = pgTable('filaments', {
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
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
});

// Long-lived bearer tokens for the external REST API (/api/v1). Only the
// SHA-256 hash is stored; the plaintext is shown once at creation on /account.
export const apiTokens = pgTable('api_tokens', {
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
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
  lastUsedAt: timestamp('last_used_at', { withTimezone: true }),
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
export const groups = pgTable('groups', {
  id: text('id')
    .primaryKey()
    .$defaultFn(() => randomUUID()),
  name: text('name').notNull(),
  ownerId: text('owner_id')
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
  // Single reusable, rotatable invite code (Discord-style)
  inviteCode: text('invite_code').notNull().unique(),
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const groupMembers = pgTable(
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
    joinedAt: timestamp('joined_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [unique().on(table.groupId, table.userId)]
);

// Per-member override list at MATERIAL granularity ("my spools of this
// material"). Meaning depends on the member's shareMode:
// whitelist -> these ARE shared; blacklist -> these are EXCLUDED.
export const filamentShareOverrides = pgTable(
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

export const lends = pgTable('lends', {
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
  requestedAt: timestamp('requested_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
  respondedAt: timestamp('responded_at', { withTimezone: true }),
  returnedAt: timestamp('returned_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
});

// In-app notifications (bell + /notifications). Actor/filament/group names are
// denormalized snapshots so notifications survive deletions of their sources.
export const notifications = pgTable('notifications', {
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
  readAt: timestamp('read_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
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
