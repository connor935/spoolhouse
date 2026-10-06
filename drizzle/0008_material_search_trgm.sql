-- Catalog search (lib/material-search.ts tokenCondition) runs one
-- `<manufacturer || ' ' || name || ' ' || filament_type> ILIKE '%token%'` per
-- token. A leading wildcard defeats btree indexes, so with a SpoolmanDB import
-- (~24k rows) every keystroke in the spool-form picker was a sequential scan.
-- A trigram GIN index on exactly that expression serves ILIKE '%…%' for
-- tokens of 3+ characters. pg_trgm is a trusted extension (PG 13+), so the
-- database owner may create it without superuser rights.
CREATE EXTENSION IF NOT EXISTS pg_trgm;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "materials_search_trgm_idx" ON "materials" USING gin (("manufacturer" || ' ' || "name" || ' ' || "filament_type") gin_trgm_ops);
