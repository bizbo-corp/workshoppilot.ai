CREATE TABLE "participant_research_contributions" (
	"id" text PRIMARY KEY NOT NULL,
	"workshop_id" text NOT NULL,
	"participant_id" text NOT NULL,
	"step_id" text NOT NULL,
	"submitted_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "participant_research_contributions" ADD CONSTRAINT "participant_research_contributions_workshop_id_workshops_id_fk" FOREIGN KEY ("workshop_id") REFERENCES "public"."workshops"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "prc_workshop_step_idx" ON "participant_research_contributions" USING btree ("workshop_id","step_id");--> statement-breakpoint
CREATE UNIQUE INDEX "prc_workshop_participant_step_unique" ON "participant_research_contributions" USING btree ("workshop_id","participant_id","step_id");