ALTER TABLE `materials` ADD `external_key` text;--> statement-breakpoint
ALTER TABLE `materials` ADD `density_g_cm3` real;--> statement-breakpoint
ALTER TABLE `materials` ADD `diameters_mm` text;--> statement-breakpoint
ALTER TABLE `materials` ADD `extruder_temp_min_c` integer;--> statement-breakpoint
ALTER TABLE `materials` ADD `extruder_temp_max_c` integer;--> statement-breakpoint
ALTER TABLE `materials` ADD `bed_temp_min_c` integer;--> statement-breakpoint
ALTER TABLE `materials` ADD `bed_temp_max_c` integer;--> statement-breakpoint
CREATE UNIQUE INDEX `materials_external_key_unique` ON `materials` (`external_key`);--> statement-breakpoint
ALTER TABLE `spool_types` ADD `external_key` text;--> statement-breakpoint
CREATE UNIQUE INDEX `spool_types_external_key_unique` ON `spool_types` (`external_key`);