CREATE TABLE "catalog_imports" (
	"id" text PRIMARY KEY NOT NULL,
	"slug" text NOT NULL,
	"materials_imported" integer DEFAULT 0 NOT NULL,
	"spool_types_imported" integer DEFAULT 0 NOT NULL,
	"last_error" text,
	"last_imported_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "catalog_imports_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
ALTER TABLE "material_properties" ADD COLUMN "value_min" numeric;--> statement-breakpoint
ALTER TABLE "material_properties" ADD COLUMN "value_max" numeric;