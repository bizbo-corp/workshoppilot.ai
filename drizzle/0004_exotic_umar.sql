-- Remove duplicate chat messages (keep earliest row per session+step+messageId)
DELETE FROM "chat_messages" a
  USING "chat_messages" b
  WHERE a."session_id" = b."session_id"
    AND a."step_id" = b."step_id"
    AND a."message_id" = b."message_id"
    AND a."created_at" > b."created_at";--> statement-breakpoint
DROP INDEX "chat_messages_message_id_idx";--> statement-breakpoint
CREATE UNIQUE INDEX "chat_messages_session_step_message_uniq" ON "chat_messages" USING btree ("session_id","step_id","message_id");