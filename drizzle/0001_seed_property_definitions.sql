-- Seed the four datasheet property definitions (density / diameter / extruder
-- temp / bed temp). Definitions only — value rows come from users, admins, or
-- the SpoolmanDB importer, which ABORTS if these four keys are missing
-- (scripts/import-spoolmandb.ts).
--
-- Generated with `drizzle-kit generate --custom` (drizzle-kit itself only emits
-- DDL). ON CONFLICT makes it a no-op on a database that already has the keys.

INSERT INTO "properties" ("id", "key", "name", "unit", "description") VALUES
  (gen_random_uuid()::text, 'density', 'Density', 'g/cm³', 'Material density'),
  (gen_random_uuid()::text, 'diameter', 'Diameter', 'mm', 'Available filament diameters'),
  (gen_random_uuid()::text, 'extruder_temp', 'Extruder temp', '°C', 'Recommended extruder temperature'),
  (gen_random_uuid()::text, 'bed_temp', 'Bed temp', '°C', 'Recommended bed temperature')
ON CONFLICT ("key") DO NOTHING;
