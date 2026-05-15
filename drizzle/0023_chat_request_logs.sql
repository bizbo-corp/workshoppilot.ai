CREATE TABLE "chat_request_logs" (
	"id" text PRIMARY KEY NOT NULL,
	"session_id" text NOT NULL,
	"step_id" text NOT NULL,
	"participant_id" text,
	"workshop_id" text NOT NULL,
	"request_id" text NOT NULL,
	"system_prompt_sha" text NOT NULL,
	"system_prompt" text NOT NULL,
	"model_messages_json" jsonb NOT NULL,
	"response_message_id" text,
	"is_replay" boolean DEFAULT false NOT NULL,
	"created_at" timestamp (3) DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "chat_request_logs" ADD CONSTRAINT "chat_request_logs_session_id_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "chat_request_logs_scope_idx" ON "chat_request_logs" USING btree ("session_id","step_id","participant_id","created_at");--> statement-breakpoint
CREATE INDEX "chat_request_logs_request_id_idx" ON "chat_request_logs" USING btree ("request_id");--> statement-breakpoint
CREATE INDEX "chat_request_logs_created_at_idx" ON "chat_request_logs" USING btree ("created_at");