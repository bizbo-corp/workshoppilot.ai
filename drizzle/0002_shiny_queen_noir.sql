CREATE TABLE IF NOT EXISTS "step_artifacts" (
	"id" text PRIMARY KEY NOT NULL,
	"workshop_step_id" text NOT NULL,
	"step_id" text NOT NULL,
	"artifact" jsonb NOT NULL,
	"schema_version" text DEFAULT '1.0' NOT NULL,
	"extracted_at" timestamp (3) DEFAULT now() NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	CONSTRAINT "step_artifacts_workshop_step_id_unique" UNIQUE("workshop_step_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "step_summaries" (
	"id" text PRIMARY KEY NOT NULL,
	"workshop_step_id" text NOT NULL,
	"step_id" text NOT NULL,
	"summary" text NOT NULL,
	"token_count" integer,
	"generated_at" timestamp (3) DEFAULT now() NOT NULL,
	CONSTRAINT "step_summaries_workshop_step_id_unique" UNIQUE("workshop_step_id")
);
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "step_artifacts" ADD CONSTRAINT "step_artifacts_workshop_step_id_workshop_steps_id_fk" FOREIGN KEY ("workshop_step_id") REFERENCES "public"."workshop_steps"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "step_summaries" ADD CONSTRAINT "step_summaries_workshop_step_id_workshop_steps_id_fk" FOREIGN KEY ("workshop_step_id") REFERENCES "public"."workshop_steps"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "step_artifacts_workshop_step_id_idx" ON "step_artifacts" USING btree ("workshop_step_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "step_summaries_workshop_step_id_idx" ON "step_summaries" USING btree ("workshop_step_id");
