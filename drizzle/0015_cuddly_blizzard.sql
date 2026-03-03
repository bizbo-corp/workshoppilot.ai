CREATE TABLE "dialogue_feedback" (
	"id" text PRIMARY KEY NOT NULL,
	"feedback_text" text NOT NULL,
	"dialogue_step_id" text NOT NULL,
	"arc_phase" text,
	"file_path" text NOT NULL,
	"component_name" text NOT NULL,
	"context_snapshot" jsonb NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"resolution_note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "asset_library" ALTER COLUMN "category" SET DEFAULT 'stamp';--> statement-breakpoint
CREATE INDEX "dialogue_feedback_status_idx" ON "dialogue_feedback" USING btree ("status");--> statement-breakpoint
CREATE INDEX "dialogue_feedback_step_idx" ON "dialogue_feedback" USING btree ("dialogue_step_id");