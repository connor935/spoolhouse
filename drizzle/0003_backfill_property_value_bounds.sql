-- Backfill material_properties.value_min / value_max for rows written before
-- those columns existed. Must mirror parseBounds() in lib/property-filter.ts:
-- take every unsigned decimal number in the free-text value and keep the lowest
-- and highest ("1.24" -> 1.24/1.24, "210–230" -> 210/230, "1.75, 2.85" ->
-- 1.75/2.85). Rows with no number keep NULL bounds and so never match a range
-- filter — the same outcome as parseBounds() returning null today.
--
-- The en-dash in ranges is not a minus sign, so bounds parse as two positive
-- numbers; the pattern below deliberately does not accept a leading sign.

UPDATE "material_properties" AS mp
SET "value_min" = b.lo,
    "value_max" = b.hi
FROM (
  SELECT p."id" AS id,
         MIN((m.parts[1])::numeric) AS lo,
         MAX((m.parts[1])::numeric) AS hi
  FROM "material_properties" p
  CROSS JOIN LATERAL regexp_matches(p."value", '(\d+(?:\.\d+)?)', 'g') AS m(parts)
  GROUP BY p."id"
) AS b
WHERE mp."id" = b.id;
