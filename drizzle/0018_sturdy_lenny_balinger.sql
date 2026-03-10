DROP INDEX "chat_messages_session_step_message_uniq";--> statement-breakpoint
ALTER TABLE "chat_messages" ADD COLUMN "participant_id" text;--> statement-breakpoint
CREATE INDEX "chat_messages_session_step_participant_idx" ON "chat_messages" USING btree ("session_id","step_id","participant_id");--> statement-breakpoint
CREATE UNIQUE INDEX "chat_messages_session_step_participant_message_uniq" ON "chat_messages" USING btree ("session_id","step_id","participant_id","message_id");