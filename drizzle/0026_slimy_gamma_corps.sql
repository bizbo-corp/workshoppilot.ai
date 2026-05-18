CREATE TABLE "workshop_step_narration" (
	"id" text PRIMARY KEY NOT NULL,
	"workshop_id" text NOT NULL,
	"step_id" text NOT NULL,
	"message_id" text NOT NULL,
	"content" text NOT NULL,
	"cta" text,
	"row_id" text,
	"progress_label" text,
	"created_at" timestamp (3) DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "workshop_step_narration" ADD CONSTRAINT "workshop_step_narration_workshop_id_workshops_id_fk" FOREIGN KEY ("workshop_id") REFERENCES "public"."workshops"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "workshop_step_narration_workshop_step_created_idx" ON "workshop_step_narration" USING btree ("workshop_id","step_id","created_at");