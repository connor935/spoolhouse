CREATE TABLE "spool_weighings" (
	"id" text PRIMARY KEY NOT NULL,
	"spool_id" text NOT NULL,
	"user_id" text,
	"grams" integer NOT NULL,
	"measured_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "lends" ADD COLUMN "start_weight_grams" integer;--> statement-breakpoint
ALTER TABLE "lends" ADD COLUMN "end_weight_grams" integer;--> statement-breakpoint
ALTER TABLE "filaments" ADD COLUMN "price_paid_cents" integer;--> statement-breakpoint
ALTER TABLE "filaments" ADD COLUMN "purchased_at" date;--> statement-breakpoint
ALTER TABLE "filaments" ADD COLUMN "location" text;--> statement-breakpoint
ALTER TABLE "filaments" ADD COLUMN "last_dried_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "spool_weighings" ADD CONSTRAINT "spool_weighings_spool_id_filaments_id_fk" FOREIGN KEY ("spool_id") REFERENCES "public"."filaments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "spool_weighings" ADD CONSTRAINT "spool_weighings_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "spool_weighings_spool_id_measured_at_idx" ON "spool_weighings" USING btree ("spool_id","measured_at");--> statement-breakpoint
CREATE INDEX "spool_weighings_user_id_idx" ON "spool_weighings" USING btree ("user_id");