CREATE TABLE "workshop_sessions" (
	"id" text PRIMARY KEY NOT NULL,
	"workshop_id" text NOT NULL,
	"liveblocks_room_id" text NOT NULL,
	"share_token" text NOT NULL,
	"status" text DEFAULT 'waiting' NOT NULL,
	"max_participants" integer DEFAULT 5 NOT NULL,
	"created_at" timestamp (3) DEFAULT now() NOT NULL,
	"started_at" timestamp (3),
	"ended_at" timestamp (3),
	CONSTRAINT "workshop_sessions_share_token_unique" UNIQUE("share_token")
);
--> statement-breakpoint
CREATE TABLE "session_participants" (
	"id" text PRIMARY KEY NOT NULL,
	"session_id" text NOT NULL,
	"clerk_user_id" text,
	"liveblocks_user_id" text NOT NULL,
	"display_name" text NOT NULL,
	"color" text NOT NULL,
	"role" text DEFAULT 'participant' NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"joined_at" timestamp (3) DEFAULT now() NOT NULL,
	"last_seen_at" timestamp (3)
);
--> statement-breakpoint
ALTER TABLE "workshops" ADD COLUMN "workshop_type" text DEFAULT 'solo' NOT NULL;--> statement-breakpoint
ALTER TABLE "workshops" ADD COLUMN "max_participants" integer;--> statement-breakpoint
ALTER TABLE "workshop_sessions" ADD CONSTRAINT "workshop_sessions_workshop_id_workshops_id_fk" FOREIGN KEY ("workshop_id") REFERENCES "public"."workshops"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session_participants" ADD CONSTRAINT "session_participants_session_id_workshop_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."workshop_sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "workshop_sessions_workshop_id_idx" ON "workshop_sessions" USING btree ("workshop_id");--> statement-breakpoint
CREATE INDEX "workshop_sessions_status_idx" ON "workshop_sessions" USING btree ("status");--> statement-breakpoint
CREATE INDEX "session_participants_session_id_idx" ON "session_participants" USING btree ("session_id");--> statement-breakpoint
CREATE INDEX "session_participants_clerk_user_id_idx" ON "session_participants" USING btree ("clerk_user_id");--> statement-breakpoint
CREATE INDEX "session_participants_liveblocks_user_id_idx" ON "session_participants" USING btree ("liveblocks_user_id");