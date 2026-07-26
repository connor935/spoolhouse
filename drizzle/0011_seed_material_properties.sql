-- Seed the four property definitions migrated out of the old materials extra
-- columns (density / diameter / extruder temp / bed temp), then copy each
-- material's non-NULL column data into material_properties value rows.
--
-- Seeded rows are verified with submitted_by_id NULL (they come from the
-- SpoolmanDB import = manufacturer datasheets). Values are stored WITHOUT the
-- unit (the unit lives on the definition); the UI renders value + unit, so the
-- displayed strings stay byte-identical to the old material-dialog formatting
-- (min==max collapses, en-dash ranges, comma+space diameter lists).
--
-- The `id` values use the same v4-UUID expression as 0009; property ids are
-- resolved by `key` subselect so nothing hardcodes a UUID.

INSERT INTO `properties` (`id`, `key`, `name`, `unit`, `description`) VALUES
  (lower(hex(randomblob(4))||'-'||hex(randomblob(2))||'-4'||substr(hex(randomblob(2)),2)||'-'||substr('89ab',abs(random())%4+1,1)||substr(hex(randomblob(2)),2)||'-'||hex(randomblob(6))), 'density', 'Density', 'g/cm³', 'Material density'),
  (lower(hex(randomblob(4))||'-'||hex(randomblob(2))||'-4'||substr(hex(randomblob(2)),2)||'-'||substr('89ab',abs(random())%4+1,1)||substr(hex(randomblob(2)),2)||'-'||hex(randomblob(6))), 'diameter', 'Diameter', 'mm', 'Available filament diameters'),
  (lower(hex(randomblob(4))||'-'||hex(randomblob(2))||'-4'||substr(hex(randomblob(2)),2)||'-'||substr('89ab',abs(random())%4+1,1)||substr(hex(randomblob(2)),2)||'-'||hex(randomblob(6))), 'extruder_temp', 'Extruder temp', '°C', 'Recommended extruder temperature'),
  (lower(hex(randomblob(4))||'-'||hex(randomblob(2))||'-4'||substr(hex(randomblob(2)),2)||'-'||substr('89ab',abs(random())%4+1,1)||substr(hex(randomblob(2)),2)||'-'||hex(randomblob(6))), 'bed_temp', 'Bed temp', '°C', 'Recommended bed temperature');
--> statement-breakpoint

INSERT INTO `material_properties` (`id`, `material_id`, `property_id`, `value`, `verified`)
SELECT
  lower(hex(randomblob(4))||'-'||hex(randomblob(2))||'-4'||substr(hex(randomblob(2)),2)||'-'||substr('89ab',abs(random())%4+1,1)||substr(hex(randomblob(2)),2)||'-'||hex(randomblob(6))),
  m.`id`,
  (SELECT `id` FROM `properties` WHERE `key` = 'density'),
  CAST(m.`density_g_cm3` AS TEXT),
  1
FROM `materials` m
WHERE m.`density_g_cm3` IS NOT NULL;
--> statement-breakpoint

INSERT INTO `material_properties` (`id`, `material_id`, `property_id`, `value`, `verified`)
SELECT
  lower(hex(randomblob(4))||'-'||hex(randomblob(2))||'-4'||substr(hex(randomblob(2)),2)||'-'||substr('89ab',abs(random())%4+1,1)||substr(hex(randomblob(2)),2)||'-'||hex(randomblob(6))),
  m.`id`,
  (SELECT `id` FROM `properties` WHERE `key` = 'diameter'),
  replace(m.`diameters_mm`, ',', ', '),
  1
FROM `materials` m
WHERE m.`diameters_mm` IS NOT NULL;
--> statement-breakpoint

INSERT INTO `material_properties` (`id`, `material_id`, `property_id`, `value`, `verified`)
SELECT
  lower(hex(randomblob(4))||'-'||hex(randomblob(2))||'-4'||substr(hex(randomblob(2)),2)||'-'||substr('89ab',abs(random())%4+1,1)||substr(hex(randomblob(2)),2)||'-'||hex(randomblob(6))),
  m.`id`,
  (SELECT `id` FROM `properties` WHERE `key` = 'extruder_temp'),
  CASE
    WHEN m.`extruder_temp_min_c` IS NULL THEN CAST(m.`extruder_temp_max_c` AS TEXT)
    WHEN m.`extruder_temp_max_c` IS NULL THEN CAST(m.`extruder_temp_min_c` AS TEXT)
    WHEN m.`extruder_temp_min_c` = m.`extruder_temp_max_c` THEN CAST(m.`extruder_temp_min_c` AS TEXT)
    ELSE m.`extruder_temp_min_c` || '–' || m.`extruder_temp_max_c`
  END,
  1
FROM `materials` m
WHERE m.`extruder_temp_min_c` IS NOT NULL OR m.`extruder_temp_max_c` IS NOT NULL;
--> statement-breakpoint

INSERT INTO `material_properties` (`id`, `material_id`, `property_id`, `value`, `verified`)
SELECT
  lower(hex(randomblob(4))||'-'||hex(randomblob(2))||'-4'||substr(hex(randomblob(2)),2)||'-'||substr('89ab',abs(random())%4+1,1)||substr(hex(randomblob(2)),2)||'-'||hex(randomblob(6))),
  m.`id`,
  (SELECT `id` FROM `properties` WHERE `key` = 'bed_temp'),
  CASE
    WHEN m.`bed_temp_min_c` IS NULL THEN CAST(m.`bed_temp_max_c` AS TEXT)
    WHEN m.`bed_temp_max_c` IS NULL THEN CAST(m.`bed_temp_min_c` AS TEXT)
    WHEN m.`bed_temp_min_c` = m.`bed_temp_max_c` THEN CAST(m.`bed_temp_min_c` AS TEXT)
    ELSE m.`bed_temp_min_c` || '–' || m.`bed_temp_max_c`
  END,
  1
FROM `materials` m
WHERE m.`bed_temp_min_c` IS NOT NULL OR m.`bed_temp_max_c` IS NOT NULL;
