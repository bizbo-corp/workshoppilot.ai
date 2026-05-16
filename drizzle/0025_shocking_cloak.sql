ALTER TABLE "workshop_invitations" ADD COLUMN "resend_message_id" text;--> statement-breakpoint
ALTER TABLE "workshop_invitations" ADD COLUMN "last_send_error" text;--> statement-breakpoint
ALTER TABLE "workshop_invitations" ADD COLUMN "last_send_at" timestamp (3);