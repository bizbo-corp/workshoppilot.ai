CREATE TABLE "workshop_invitations" (
	"id" text PRIMARY KEY NOT NULL,
	"workshop_id" text NOT NULL,
	"email" text NOT NULL,
	"invite_token" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"invited_by_clerk_user_id" text NOT NULL,
	"invited_at" timestamp (3) DEFAULT now() NOT NULL,
	"accepted_at" timestamp (3),
	"session_participant_id" text
);
--> statement-breakpoint
CREATE TABLE "challenge_approvals" (
	"id" text PRIMARY KEY NOT NULL,
	"workshop_id" text NOT NULL,
	"session_participant_id" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"change_request_note" text,
	"challenge_revision" integer DEFAULT 1 NOT NULL,
	"responded_at" timestamp (3),
	"created_at" timestamp (3) DEFAULT now() NOT NULL,
	"updated_at" timestamp (3) DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "workshops" ADD COLUMN "last_visited_at" timestamp (3);--> statement-breakpoint
ALTER TABLE "workshops" ADD COLUMN "facilitator_mode" text DEFAULT 'solo' NOT NULL;--> statement-breakpoint
ALTER TABLE "workshops" ADD COLUMN "challenge_published_at" timestamp (3);--> statement-breakpoint
ALTER TABLE "workshops" ADD COLUMN "challenge_revision" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "session_participants" ADD COLUMN "rejoin_token" text;--> statement-breakpoint
ALTER TABLE "workshop_invitations" ADD CONSTRAINT "workshop_invitations_workshop_id_workshops_id_fk" FOREIGN KEY ("workshop_id") REFERENCES "public"."workshops"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workshop_invitations" ADD CONSTRAINT "workshop_invitations_session_participant_id_session_participants_id_fk" FOREIGN KEY ("session_participant_id") REFERENCES "public"."session_participants"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "challenge_approvals" ADD CONSTRAINT "challenge_approvals_workshop_id_workshops_id_fk" FOREIGN KEY ("workshop_id") REFERENCES "public"."workshops"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "challenge_approvals" ADD CONSTRAINT "challenge_approvals_session_participant_id_session_participants_id_fk" FOREIGN KEY ("session_participant_id") REFERENCES "public"."session_participants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "workshop_invitations_workshop_id_idx" ON "workshop_invitations" USING btree ("workshop_id");--> statement-breakpoint
CREATE UNIQUE INDEX "workshop_invitations_token_idx" ON "workshop_invitations" USING btree ("invite_token");--> statement-breakpoint
CREATE UNIQUE INDEX "workshop_invitations_workshop_email_unique" ON "workshop_invitations" USING btree ("workshop_id",lower("email"));--> statement-breakpoint
CREATE INDEX "challenge_approvals_workshop_id_idx" ON "challenge_approvals" USING btree ("workshop_id");--> statement-breakpoint
CREATE UNIQUE INDEX "challenge_approvals_workshop_participant_unique" ON "challenge_approvals" USING btree ("workshop_id","session_participant_id");--> statement-breakpoint
CREATE UNIQUE INDEX "session_participants_rejoin_token_idx" ON "session_participants" USING btree ("rejoin_token");