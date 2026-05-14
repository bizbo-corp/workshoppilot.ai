ALTER TABLE "workshops" ADD COLUMN "scheduled_start_at" timestamp (3);--> statement-breakpoint
ALTER TABLE "workshops" ADD COLUMN "scheduled_duration_minutes" integer;--> statement-breakpoint
ALTER TABLE "workshops" ADD COLUMN "scheduled_timezone" text;--> statement-breakpoint
ALTER TABLE "workshops" ADD COLUMN "workshop_started_at" timestamp (3);