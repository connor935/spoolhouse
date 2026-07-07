PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_filament_share_overrides` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`group_member_id` integer NOT NULL,
	`material_id` integer NOT NULL,
	FOREIGN KEY (`group_member_id`) REFERENCES `group_members`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`material_id`) REFERENCES `materials`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
INSERT INTO `__new_filament_share_overrides`("id", "group_member_id", "material_id") SELECT "id", "group_member_id", "material_id" FROM `filament_share_overrides`;--> statement-breakpoint
DROP TABLE `filament_share_overrides`;--> statement-breakpoint
ALTER TABLE `__new_filament_share_overrides` RENAME TO `filament_share_overrides`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE UNIQUE INDEX `filament_share_overrides_group_member_id_material_id_unique` ON `filament_share_overrides` (`group_member_id`,`material_id`);--> statement-breakpoint
CREATE TABLE `__new_filaments` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` text NOT NULL,
	`material_id` integer NOT NULL,
	`spool_type_id` integer NOT NULL,
	`full_filament_weight_grams` integer NOT NULL,
	`measured_total_weight_grams` integer NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`material_id`) REFERENCES `materials`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`spool_type_id`) REFERENCES `spool_types`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
INSERT INTO `__new_filaments`("id", "user_id", "material_id", "spool_type_id", "full_filament_weight_grams", "measured_total_weight_grams", "created_at", "updated_at") SELECT "id", "user_id", "material_id", "spool_type_id", "full_filament_weight_grams", "measured_total_weight_grams", "created_at", "updated_at" FROM `filaments`;--> statement-breakpoint
DROP TABLE `filaments`;--> statement-breakpoint
ALTER TABLE `__new_filaments` RENAME TO `filaments`;