CREATE TABLE `material_properties` (
	`id` text PRIMARY KEY NOT NULL,
	`material_id` text NOT NULL,
	`property_id` text NOT NULL,
	`value` text NOT NULL,
	`verified` integer DEFAULT false NOT NULL,
	`submitted_by_id` text,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`material_id`) REFERENCES `materials`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`property_id`) REFERENCES `properties`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`submitted_by_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE UNIQUE INDEX `material_properties_material_id_property_id_unique` ON `material_properties` (`material_id`,`property_id`);--> statement-breakpoint
CREATE TABLE `properties` (
	`id` text PRIMARY KEY NOT NULL,
	`key` text NOT NULL,
	`name` text NOT NULL,
	`unit` text,
	`description` text,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `properties_key_unique` ON `properties` (`key`);--> statement-breakpoint
ALTER TABLE `user` ADD `trusted_contributor` integer DEFAULT false;