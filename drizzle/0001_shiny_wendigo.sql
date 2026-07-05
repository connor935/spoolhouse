CREATE TABLE `spool_types` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`manufacturer` text NOT NULL,
	`name` text NOT NULL,
	`empty_weight_grams` integer NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`submitted_by_id` text,
	`reviewed_by_id` text,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`submitted_by_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`reviewed_by_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
ALTER TABLE `filaments` ADD `spool_type_id` integer REFERENCES spool_types(id);--> statement-breakpoint
ALTER TABLE `filaments` ADD `full_filament_weight_grams` integer;--> statement-breakpoint
ALTER TABLE `filaments` ADD `measured_total_weight_grams` integer;--> statement-breakpoint
INSERT INTO `spool_types` (`manufacturer`, `name`, `empty_weight_grams`, `status`, `submitted_by_id`)
SELECT `manufacturer`, 'Standard', CAST(ROUND(`empty_spool_weight` * 1000) AS INTEGER), 'approved', MIN(`user_id`)
FROM `filaments`
GROUP BY `manufacturer`, CAST(ROUND(`empty_spool_weight` * 1000) AS INTEGER);--> statement-breakpoint
UPDATE `filaments` SET
  `spool_type_id` = (
    SELECT `st`.`id` FROM `spool_types` `st`
    WHERE `st`.`manufacturer` = `filaments`.`manufacturer`
      AND `st`.`empty_weight_grams` = CAST(ROUND(`filaments`.`empty_spool_weight` * 1000) AS INTEGER)
  ),
  `full_filament_weight_grams` = CAST(ROUND(`full_filament_weight` * 1000) AS INTEGER),
  `measured_total_weight_grams` = CAST(ROUND(`measured_total_weight` * 1000) AS INTEGER);