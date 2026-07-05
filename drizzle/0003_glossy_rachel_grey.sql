CREATE TABLE `filament_share_overrides` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`group_member_id` integer NOT NULL,
	`filament_id` integer NOT NULL,
	FOREIGN KEY (`group_member_id`) REFERENCES `group_members`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`filament_id`) REFERENCES `filaments`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `filament_share_overrides_group_member_id_filament_id_unique` ON `filament_share_overrides` (`group_member_id`,`filament_id`);--> statement-breakpoint
CREATE TABLE `group_members` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`group_id` integer NOT NULL,
	`user_id` text NOT NULL,
	`role` text DEFAULT 'member' NOT NULL,
	`share_mode` text DEFAULT 'all' NOT NULL,
	`joined_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`group_id`) REFERENCES `groups`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `group_members_group_id_user_id_unique` ON `group_members` (`group_id`,`user_id`);--> statement-breakpoint
CREATE TABLE `groups` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`owner_id` text NOT NULL,
	`invite_code` text NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`owner_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `groups_invite_code_unique` ON `groups` (`invite_code`);--> statement-breakpoint
CREATE TABLE `lends` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`filament_id` integer NOT NULL,
	`borrower_id` text NOT NULL,
	`group_id` integer NOT NULL,
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
