CREATE TABLE "guided_pilot_inquiries" (
	"id" text PRIMARY KEY NOT NULL,
	"clerk_user_id" text,
	"email" text NOT NULL,
	"name" text NOT NULL,
	"workshop_goal" text NOT NULL,
	"stakeholder_count" text NOT NULL,
	"timeline" text NOT NULL,
	"notes" text,
	"deposit_paid" boolean DEFAULT false NOT NULL,
	"stripe_session_id" text,
	"status" text DEFAULT 'new' NOT NULL,
	"created_at" timestamp (3) DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "guided_pilot_inquiries_email_idx" ON "guided_pilot_inquiries" USING btree ("email");--> statement-breakpoint
CREATE INDEX "guided_pilot_inquiries_status_idx" ON "guided_pilot_inquiries" USING btree ("status");