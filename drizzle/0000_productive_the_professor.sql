CREATE TABLE `filaments` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`manufacturer` text NOT NULL,
	`filament_type` text NOT NULL,
	`color` text,
	`empty_spool_weight` real NOT NULL,
	`full_filament_weight` real NOT NULL,
	`measured_total_weight` real NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL
);
