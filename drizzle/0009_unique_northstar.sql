-- Convert all app-table integer PKs (and the FKs between them) to random UUIDs,
-- preserving existing data and every relationship. `user`/auth tables are
-- untouched (better-auth owns them; already text ids).
--
-- Strategy: build an old_int_id -> new_uuid map per table FIRST (from the
-- original tables, before any drop), then recreate each table translating its
-- PK and every app-table FK through the maps. Kept under foreign_keys=OFF so
-- drop/recreate order and cross-table refs can't trip FK enforcement.
PRAGMA foreign_keys=OFF;--> statement-breakpoint

-- id maps (new_id is a v4 UUID generated per row) ------------------------------
CREATE TABLE `__map_materials` (`old_id` integer PRIMARY KEY, `new_id` text NOT NULL);--> statement-breakpoint
INSERT INTO `__map_materials` SELECT `id`, lower(hex(randomblob(4))||'-'||hex(randomblob(2))||'-4'||substr(hex(randomblob(2)),2)||'-'||substr('89ab',abs(random())%4+1,1)||substr(hex(randomblob(2)),2)||'-'||hex(randomblob(6))) FROM `materials`;--> statement-breakpoint
CREATE TABLE `__map_spool_types` (`old_id` integer PRIMARY KEY, `new_id` text NOT NULL);--> statement-breakpoint
INSERT INTO `__map_spool_types` SELECT `id`, lower(hex(randomblob(4))||'-'||hex(randomblob(2))||'-4'||substr(hex(randomblob(2)),2)||'-'||substr('89ab',abs(random())%4+1,1)||substr(hex(randomblob(2)),2)||'-'||hex(randomblob(6))) FROM `spool_types`;--> statement-breakpoint
CREATE TABLE `__map_groups` (`old_id` integer PRIMARY KEY, `new_id` text NOT NULL);--> statement-breakpoint
INSERT INTO `__map_groups` SELECT `id`, lower(hex(randomblob(4))||'-'||hex(randomblob(2))||'-4'||substr(hex(randomblob(2)),2)||'-'||substr('89ab',abs(random())%4+1,1)||substr(hex(randomblob(2)),2)||'-'||hex(randomblob(6))) FROM `groups`;--> statement-breakpoint
CREATE TABLE `__map_api_tokens` (`old_id` integer PRIMARY KEY, `new_id` text NOT NULL);--> statement-breakpoint
INSERT INTO `__map_api_tokens` SELECT `id`, lower(hex(randomblob(4))||'-'||hex(randomblob(2))||'-4'||substr(hex(randomblob(2)),2)||'-'||substr('89ab',abs(random())%4+1,1)||substr(hex(randomblob(2)),2)||'-'||hex(randomblob(6))) FROM `api_tokens`;--> statement-breakpoint
CREATE TABLE `__map_filaments` (`old_id` integer PRIMARY KEY, `new_id` text NOT NULL);--> statement-breakpoint
INSERT INTO `__map_filaments` SELECT `id`, lower(hex(randomblob(4))||'-'||hex(randomblob(2))||'-4'||substr(hex(randomblob(2)),2)||'-'||substr('89ab',abs(random())%4+1,1)||substr(hex(randomblob(2)),2)||'-'||hex(randomblob(6))) FROM `filaments`;--> statement-breakpoint
CREATE TABLE `__map_group_members` (`old_id` integer PRIMARY KEY, `new_id` text NOT NULL);--> statement-breakpoint
INSERT INTO `__map_group_members` SELECT `id`, lower(hex(randomblob(4))||'-'||hex(randomblob(2))||'-4'||substr(hex(randomblob(2)),2)||'-'||substr('89ab',abs(random())%4+1,1)||substr(hex(randomblob(2)),2)||'-'||hex(randomblob(6))) FROM `group_members`;--> statement-breakpoint
CREATE TABLE `__map_lends` (`old_id` integer PRIMARY KEY, `new_id` text NOT NULL);--> statement-breakpoint
INSERT INTO `__map_lends` SELECT `id`, lower(hex(randomblob(4))||'-'||hex(randomblob(2))||'-4'||substr(hex(randomblob(2)),2)||'-'||substr('89ab',abs(random())%4+1,1)||substr(hex(randomblob(2)),2)||'-'||hex(randomblob(6))) FROM `lends`;--> statement-breakpoint
CREATE TABLE `__map_filament_share_overrides` (`old_id` integer PRIMARY KEY, `new_id` text NOT NULL);--> statement-breakpoint
INSERT INTO `__map_filament_share_overrides` SELECT `id`, lower(hex(randomblob(4))||'-'||hex(randomblob(2))||'-4'||substr(hex(randomblob(2)),2)||'-'||substr('89ab',abs(random())%4+1,1)||substr(hex(randomblob(2)),2)||'-'||hex(randomblob(6))) FROM `filament_share_overrides`;--> statement-breakpoint
CREATE TABLE `__map_notifications` (`old_id` integer PRIMARY KEY, `new_id` text NOT NULL);--> statement-breakpoint
INSERT INTO `__map_notifications` SELECT `id`, lower(hex(randomblob(4))||'-'||hex(randomblob(2))||'-4'||substr(hex(randomblob(2)),2)||'-'||substr('89ab',abs(random())%4+1,1)||substr(hex(randomblob(2)),2)||'-'||hex(randomblob(6))) FROM `notifications`;--> statement-breakpoint

-- materials (no app-table FK) --------------------------------------------------
CREATE TABLE `__new_materials` (
	`id` text PRIMARY KEY NOT NULL,
	`manufacturer` text NOT NULL,
	`name` text NOT NULL,
	`filament_type` text NOT NULL,
	`color` text,
	`status` text DEFAULT 'pending' NOT NULL,
	`submitted_by_id` text,
	`reviewed_by_id` text,
	`external_key` text,
	`density_g_cm3` real,
	`diameters_mm` text,
	`extruder_temp_min_c` integer,
	`extruder_temp_max_c` integer,
	`bed_temp_min_c` integer,
	`bed_temp_max_c` integer,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`submitted_by_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`reviewed_by_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
INSERT INTO `__new_materials` SELECT mm.new_id, m.manufacturer, m.name, m.filament_type, m.color, m.status, m.submitted_by_id, m.reviewed_by_id, m.external_key, m.density_g_cm3, m.diameters_mm, m.extruder_temp_min_c, m.extruder_temp_max_c, m.bed_temp_min_c, m.bed_temp_max_c, m.created_at, m.updated_at FROM `materials` m JOIN `__map_materials` mm ON mm.old_id = m.id;--> statement-breakpoint
DROP TABLE `materials`;--> statement-breakpoint
ALTER TABLE `__new_materials` RENAME TO `materials`;--> statement-breakpoint
CREATE UNIQUE INDEX `materials_external_key_unique` ON `materials` (`external_key`);--> statement-breakpoint

-- spool_types (no app-table FK) ------------------------------------------------
CREATE TABLE `__new_spool_types` (
	`id` text PRIMARY KEY NOT NULL,
	`manufacturer` text NOT NULL,
	`name` text NOT NULL,
	`empty_weight_grams` integer NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`external_key` text,
	`submitted_by_id` text,
	`reviewed_by_id` text,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`submitted_by_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`reviewed_by_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
INSERT INTO `__new_spool_types` SELECT ms.new_id, s.manufacturer, s.name, s.empty_weight_grams, s.status, s.external_key, s.submitted_by_id, s.reviewed_by_id, s.created_at, s.updated_at FROM `spool_types` s JOIN `__map_spool_types` ms ON ms.old_id = s.id;--> statement-breakpoint
DROP TABLE `spool_types`;--> statement-breakpoint
ALTER TABLE `__new_spool_types` RENAME TO `spool_types`;--> statement-breakpoint
CREATE UNIQUE INDEX `spool_types_external_key_unique` ON `spool_types` (`external_key`);--> statement-breakpoint

-- groups (no app-table FK) -----------------------------------------------------
CREATE TABLE `__new_groups` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`owner_id` text NOT NULL,
	`invite_code` text NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`owner_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
INSERT INTO `__new_groups` SELECT mg.new_id, g.name, g.owner_id, g.invite_code, g.created_at, g.updated_at FROM `groups` g JOIN `__map_groups` mg ON mg.old_id = g.id;--> statement-breakpoint
DROP TABLE `groups`;--> statement-breakpoint
ALTER TABLE `__new_groups` RENAME TO `groups`;--> statement-breakpoint
CREATE UNIQUE INDEX `groups_invite_code_unique` ON `groups` (`invite_code`);--> statement-breakpoint

-- api_tokens (no app-table FK) -------------------------------------------------
CREATE TABLE `__new_api_tokens` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`name` text NOT NULL,
	`token_hash` text NOT NULL,
	`token_prefix` text NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`last_used_at` integer,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
INSERT INTO `__new_api_tokens` SELECT mt.new_id, t.user_id, t.name, t.token_hash, t.token_prefix, t.created_at, t.last_used_at FROM `api_tokens` t JOIN `__map_api_tokens` mt ON mt.old_id = t.id;--> statement-breakpoint
DROP TABLE `api_tokens`;--> statement-breakpoint
ALTER TABLE `__new_api_tokens` RENAME TO `api_tokens`;--> statement-breakpoint
CREATE UNIQUE INDEX `api_tokens_token_hash_unique` ON `api_tokens` (`token_hash`);--> statement-breakpoint

-- filaments (FK: material_id, spool_type_id) -----------------------------------
CREATE TABLE `__new_filaments` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`material_id` text NOT NULL,
	`spool_type_id` text NOT NULL,
	`full_filament_weight_grams` integer NOT NULL,
	`measured_total_weight_grams` integer NOT NULL,
	`tag_uid` text,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`material_id`) REFERENCES `materials`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`spool_type_id`) REFERENCES `spool_types`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
INSERT INTO `__new_filaments` SELECT mf.new_id, f.user_id, mm.new_id, mst.new_id, f.full_filament_weight_grams, f.measured_total_weight_grams, f.tag_uid, f.created_at, f.updated_at FROM `filaments` f JOIN `__map_filaments` mf ON mf.old_id = f.id JOIN `__map_materials` mm ON mm.old_id = f.material_id JOIN `__map_spool_types` mst ON mst.old_id = f.spool_type_id;--> statement-breakpoint
DROP TABLE `filaments`;--> statement-breakpoint
ALTER TABLE `__new_filaments` RENAME TO `filaments`;--> statement-breakpoint

-- group_members (FK: group_id) -------------------------------------------------
CREATE TABLE `__new_group_members` (
	`id` text PRIMARY KEY NOT NULL,
	`group_id` text NOT NULL,
	`user_id` text NOT NULL,
	`role` text DEFAULT 'member' NOT NULL,
	`share_mode` text DEFAULT 'all' NOT NULL,
	`joined_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`group_id`) REFERENCES `groups`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
INSERT INTO `__new_group_members` SELECT mgm.new_id, mg.new_id, gm.user_id, gm.role, gm.share_mode, gm.joined_at FROM `group_members` gm JOIN `__map_group_members` mgm ON mgm.old_id = gm.id JOIN `__map_groups` mg ON mg.old_id = gm.group_id;--> statement-breakpoint
DROP TABLE `group_members`;--> statement-breakpoint
ALTER TABLE `__new_group_members` RENAME TO `group_members`;--> statement-breakpoint
CREATE UNIQUE INDEX `group_members_group_id_user_id_unique` ON `group_members` (`group_id`,`user_id`);--> statement-breakpoint

-- lends (FK: filament_id, group_id) --------------------------------------------
CREATE TABLE `__new_lends` (
	`id` text PRIMARY KEY NOT NULL,
	`filament_id` text NOT NULL,
	`borrower_id` text NOT NULL,
	`group_id` text NOT NULL,
	`status` text DEFAULT 'requested' NOT NULL,
	`requested_at` integer DEFAULT (unixepoch()) NOT NULL,
	`responded_at` integer,
	`returned_at` integer,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`filament_id`) REFERENCES `filaments`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`borrower_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`group_id`) REFERENCES `groups`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
INSERT INTO `__new_lends` SELECT ml.new_id, mf.new_id, l.borrower_id, mg.new_id, l.status, l.requested_at, l.responded_at, l.returned_at, l.created_at, l.updated_at FROM `lends` l JOIN `__map_lends` ml ON ml.old_id = l.id JOIN `__map_filaments` mf ON mf.old_id = l.filament_id JOIN `__map_groups` mg ON mg.old_id = l.group_id;--> statement-breakpoint
DROP TABLE `lends`;--> statement-breakpoint
ALTER TABLE `__new_lends` RENAME TO `lends`;--> statement-breakpoint

-- filament_share_overrides (FK: group_member_id, material_id) -------------------
CREATE TABLE `__new_filament_share_overrides` (
	`id` text PRIMARY KEY NOT NULL,
	`group_member_id` text NOT NULL,
	`material_id` text NOT NULL,
	FOREIGN KEY (`group_member_id`) REFERENCES `group_members`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`material_id`) REFERENCES `materials`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
INSERT INTO `__new_filament_share_overrides` SELECT mo.new_id, mgm.new_id, mm.new_id FROM `filament_share_overrides` o JOIN `__map_filament_share_overrides` mo ON mo.old_id = o.id JOIN `__map_group_members` mgm ON mgm.old_id = o.group_member_id JOIN `__map_materials` mm ON mm.old_id = o.material_id;--> statement-breakpoint
DROP TABLE `filament_share_overrides`;--> statement-breakpoint
ALTER TABLE `__new_filament_share_overrides` RENAME TO `filament_share_overrides`;--> statement-breakpoint
CREATE UNIQUE INDEX `filament_share_overrides_group_member_id_material_id_unique` ON `filament_share_overrides` (`group_member_id`,`material_id`);--> statement-breakpoint

-- notifications (soft ref: lend_id, nullable) ----------------------------------
CREATE TABLE `__new_notifications` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`type` text NOT NULL,
	`actor_name` text NOT NULL,
	`filament_name` text NOT NULL,
	`group_name` text NOT NULL,
	`lend_id` text,
	`read_at` integer,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
INSERT INTO `__new_notifications` SELECT mn.new_id, n.user_id, n.type, n.actor_name, n.filament_name, n.group_name, ml.new_id, n.read_at, n.created_at FROM `notifications` n JOIN `__map_notifications` mn ON mn.old_id = n.id LEFT JOIN `__map_lends` ml ON ml.old_id = n.lend_id;--> statement-breakpoint
DROP TABLE `notifications`;--> statement-breakpoint
ALTER TABLE `__new_notifications` RENAME TO `notifications`;--> statement-breakpoint

-- drop id maps -----------------------------------------------------------------
DROP TABLE `__map_materials`;--> statement-breakpoint
DROP TABLE `__map_spool_types`;--> statement-breakpoint
DROP TABLE `__map_groups`;--> statement-breakpoint
DROP TABLE `__map_api_tokens`;--> statement-breakpoint
DROP TABLE `__map_filaments`;--> statement-breakpoint
DROP TABLE `__map_group_members`;--> statement-breakpoint
DROP TABLE `__map_lends`;--> statement-breakpoint
DROP TABLE `__map_filament_share_overrides`;--> statement-breakpoint
DROP TABLE `__map_notifications`;--> statement-breakpoint
PRAGMA foreign_keys=ON;
