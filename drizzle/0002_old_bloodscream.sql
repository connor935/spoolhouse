PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_filaments` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` text NOT NULL,
	`name` text NOT NULL,
	`manufacturer` text NOT NULL,
	`filament_type` text NOT NULL,
	`color` text,
	`spool_type_id` integer NOT NULL,
	`full_filament_weight_grams` integer NOT NULL,
	`measured_total_weight_grams` integer NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`spool_type_id`) REFERENCES `spool_types`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
INSERT INTO `__new_filaments`("id", "user_id", "name", "manufacturer", "filament_type", "color", "spool_type_id", "full_filament_weight_grams", "measured_total_weight_grams", "created_at", "updated_at") SELECT "id", "user_id", "name", "manufacturer", "filament_type", "color", "spool_type_id", "full_filament_weight_grams", "measured_total_weight_grams", "created_at", "updated_at" FROM `filaments`;--> statement-breakpoint
DROP TABLE `filaments`;--> statement-breakpoint
ALTER TABLE `__new_filaments` RENAME TO `filaments`;--> statement-breakpoint
PRAGMA foreign_keys=ON;