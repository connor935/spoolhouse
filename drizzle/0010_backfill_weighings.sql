-- Baseline for the weighing history (drizzle/0009): one row per existing spool
-- with its current weight, dated at its last update. Without it the first
-- re-weigh after the deploy would have nothing to diff against, and
-- consumption would only start counting from the second weighing.
INSERT INTO "spool_weighings" ("id", "spool_id", "user_id", "grams", "measured_at")
SELECT gen_random_uuid()::text, "id", NULL, "measured_total_weight_grams", "updated_at"
FROM "filaments";
--> statement-breakpoint
-- Lends already out: their usage counts from now (the best known start).
UPDATE "lends" SET "start_weight_grams" = f."measured_total_weight_grams"
FROM "filaments" f
WHERE "lends"."filament_id" = f."id" AND "lends"."status" = 'active';
--> statement-breakpoint
-- Recommended drying temperature, shown with the "dry?" hint on hygroscopic
-- spools. Admin/user-filled like any other property (the importer has no data).
INSERT INTO "properties" ("id", "key", "name", "unit", "description", "value_type") VALUES
  (gen_random_uuid()::text, 'drying_temp', 'Drying temp', '°C', 'Recommended drying temperature', 'range')
ON CONFLICT ("key") DO NOTHING;
