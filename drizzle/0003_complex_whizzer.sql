ALTER TABLE "workshops" ADD COLUMN "color" text;--> statement-breakpoint
ALTER TABLE "workshops" ADD COLUMN "emoji" text;--> statement-breakpoint
ALTER TABLE "workshops" ADD COLUMN "deleted_at" timestamp (3);--> statement-breakpoint
ALTER TABLE "workshop_steps" ADD COLUMN "arc_phase" text DEFAULT 'orient' NOT NULL;