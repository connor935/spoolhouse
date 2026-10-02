-- Data cleanup so the two new unique indexes below can be created on existing
-- data (the migration runs in one transaction — a failing CREATE UNIQUE INDEX
-- would abort the whole deploy).
--
-- 1) Spool tags: blank tags become NULL; if a user has the same tag on several
--    spools, the most recently updated spool keeps it, the others lose it.
UPDATE "filaments" SET "tag_uid" = NULL WHERE "tag_uid" IS NOT NULL AND btrim("tag_uid") = '';--> statement-breakpoint
UPDATE "filaments" SET "tag_uid" = NULL
WHERE "id" IN (
	SELECT "id" FROM (
		SELECT "id", row_number() OVER (
			PARTITION BY "user_id", "tag_uid" ORDER BY "updated_at" DESC, "id"
		) AS rn
		FROM "filaments" WHERE "tag_uid" IS NOT NULL
	) ranked WHERE rn > 1
);--> statement-breakpoint
-- 2) Lends: keep one open (requested/active) lend per spool — an active one
--    first, else the oldest request; any other open lend is declined.
UPDATE "lends" SET "status" = 'declined', "responded_at" = now(), "updated_at" = now()
WHERE "id" IN (
	SELECT "id" FROM (
		SELECT "id", row_number() OVER (
			PARTITION BY "filament_id"
			ORDER BY ("status" = 'active') DESC, "requested_at", "id"
		) AS rn
		FROM "lends" WHERE "status" IN ('requested', 'active')
	) ranked WHERE rn > 1
);--> statement-breakpoint
CREATE INDEX "api_tokens_user_id_idx" ON "api_tokens" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "filament_share_overrides_material_id_idx" ON "filament_share_overrides" USING btree ("material_id");--> statement-breakpoint
CREATE INDEX "group_members_user_id_idx" ON "group_members" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "lends_one_open_per_filament" ON "lends" USING btree ("filament_id") WHERE "lends"."status" in ('requested', 'active');--> statement-breakpoint
CREATE INDEX "lends_filament_id_idx" ON "lends" USING btree ("filament_id");--> statement-breakpoint
CREATE INDEX "lends_borrower_id_idx" ON "lends" USING btree ("borrower_id");--> statement-breakpoint
CREATE INDEX "lends_group_id_idx" ON "lends" USING btree ("group_id");--> statement-breakpoint
CREATE INDEX "material_properties_property_id_idx" ON "material_properties" USING btree ("property_id");--> statement-breakpoint
CREATE INDEX "notifications_user_id_created_at_idx" ON "notifications" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "filaments_user_id_tag_uid_unique" ON "filaments" USING btree ("user_id","tag_uid");--> statement-breakpoint
CREATE INDEX "filaments_material_id_idx" ON "filaments" USING btree ("material_id");--> statement-breakpoint
CREATE INDEX "filaments_spool_type_id_idx" ON "filaments" USING btree ("spool_type_id");