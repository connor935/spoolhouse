CREATE TABLE `materials` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`manufacturer` text NOT NULL,
	`name` text NOT NULL,
	`filament_type` text NOT NULL,
	`color` text,
	`status` text DEFAULT 'pending' NOT NULL,
	`submitted_by_id` text,
	`reviewed_by_id` text,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`submitted_by_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`reviewed_by_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_filament_share_overrides` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`group_member_id` integer NOT NULL,
	`filament_id` integer,
	`material_id` integer,
	FOREIGN KEY (`group_member_id`) REFERENCES `group_members`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`filament_id`) REFERENCES `filaments`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`material_id`) REFERENCES `materials`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
INSERT INTO `__new_filament_share_overrides`("id", "group_member_id", "filament_id", "material_id") SELECT "id", "group_member_id", "filament_id", NULL FROM `filament_share_overrides`;--> statement-breakpoint
DROP TABLE `filament_share_overrides`;--> statement-breakpoint
ALTER TABLE `__new_filament_share_overrides` RENAME TO `filament_share_overrides`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE UNIQUE INDEX `filament_share_overrides_group_member_id_filament_id_unique` ON `filament_share_overrides` (`group_member_id`,`filament_id`);--> statement-breakpoint
ALTER TABLE `filaments` ADD `material_id` integer REFERENCES materials(id);--> statement-breakpoint
INSERT INTO `materials` (`manufacturer`, `name`, `filament_type`, `color`, `status`, `submitted_by_id`)
SELECT `manufacturer`, `name`, `filament_type`, `color`, 'approved', MIN(`user_id`)
FROM `filaments`
GROUP BY `manufacturer`, `name`, `filament_type`, `color`;--> statement-breakpoint
UPDATE `filaments` SET `material_id` = (
  SELECT `m`.`id` FROM `materials` `m`
  WHERE `m`.`manufacturer` = `filaments`.`manufacturer`
    AND `m`.`name` = `filaments`.`name`
    AND `m`.`filament_type` = `filaments`.`filament_type`
    AND (`m`.`color` IS `filaments`.`color`)
);--> statement-breakpoint
UPDATE `filament_share_overrides` SET `material_id` = (
  SELECT `f`.`material_id` FROM `filaments` `f`
  WHERE `f`.`id` = `filament_share_overrides`.`filament_id`
);--> statement-breakpoint
DELETE FROM `filament_share_overrides` WHERE `id` NOT IN (
  SELECT MIN(`id`) FROM `filament_share_overrides` GROUP BY `group_member_id`, `material_id`
);