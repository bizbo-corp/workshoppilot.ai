-- Idempotent cleanup: remove any chat_messages rows with empty message_id
-- Defensive: known offenders from the duplicate-greeting bug, ref df_iqnkl9ylebansq478qjmweoy
DELETE FROM "chat_messages" WHERE "message_id" = '';
--> statement-breakpoint
-- DROP IF EXISTS + ADD pair makes the migration safe to re-run
ALTER TABLE "chat_messages"
  DROP CONSTRAINT IF EXISTS "chat_messages_message_id_nonempty_chk";
--> statement-breakpoint
ALTER TABLE "chat_messages"
  ADD CONSTRAINT "chat_messages_message_id_nonempty_chk" CHECK (length("message_id") > 0);
