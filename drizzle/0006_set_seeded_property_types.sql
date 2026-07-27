-- Type the four datasheet definitions seeded in drizzle/0001. Everything else
-- keeps the 'text' default, which is the safe fallback: text values are never
-- range-filtered, so an untyped property cannot filter wrongly.
--
-- These match the shapes the SpoolmanDB importer writes (see lib/spoolmandb.ts):
--   density        1.24            -> number
--   diameter       1.75, 2.85      -> list
--   extruder_temp  210–230 or 215  -> range
--   bed_temp       60–80 or 60     -> range
--
-- Existing values were checked against these types before this migration was
-- written; all 8976 normalise unchanged (0 rejected, 0 rewritten).

UPDATE "properties" SET "value_type" = 'number' WHERE "key" = 'density';
--> statement-breakpoint
UPDATE "properties" SET "value_type" = 'list' WHERE "key" = 'diameter';
--> statement-breakpoint
UPDATE "properties" SET "value_type" = 'range' WHERE "key" IN ('extruder_temp', 'bed_temp');
