CREATE TABLE "white_glove_bookings" (
	"id" text PRIMARY KEY NOT NULL,
	"workshop_id" text NOT NULL,
	"clerk_user_id" text NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"preferred_times" text NOT NULL,
	"timezone" text NOT NULL,
	"notes" text,
	"status" text DEFAULT 'requested' NOT NULL,
	"created_at" timestamp (3) DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "workshops" ADD COLUMN "tier" text;--> statement-breakpoint
ALTER TABLE "workshops" ADD COLUMN "tier_paid_at" timestamp (3);--> statement-breakpoint
ALTER TABLE "credit_transactions" ADD COLUMN "sku" text;--> statement-breakpoint
ALTER TABLE "white_glove_bookings" ADD CONSTRAINT "white_glove_bookings_workshop_id_workshops_id_fk" FOREIGN KEY ("workshop_id") REFERENCES "public"."workshops"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "white_glove_bookings_workshop_id_idx" ON "white_glove_bookings" USING btree ("workshop_id");--> statement-breakpoint
CREATE INDEX "white_glove_bookings_clerk_user_id_idx" ON "white_glove_bookings" USING btree ("clerk_user_id");--> statement-breakpoint
CREATE INDEX "white_glove_bookings_status_idx" ON "white_glove_bookings" USING btree ("status");--> statement-breakpoint
-- Backfill: any workshop that was previously unlocked under the credit model is retroactively
-- a 'solo' tier workshop. tier_paid_at mirrors credit_consumed_at so analytics/audit are consistent.
UPDATE "workshops" SET "tier" = 'solo', "tier_paid_at" = "credit_consumed_at" WHERE "credit_consumed_at" IS NOT NULL AND "tier" IS NULL;