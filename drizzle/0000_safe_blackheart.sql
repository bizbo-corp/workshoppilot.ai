CREATE TABLE IF NOT EXISTS "users" (
	"id" text PRIMARY KEY NOT NULL,
	"clerk_user_id" text NOT NULL,
	"email" text NOT NULL,
	"first_name" text,
	"last_name" text,
	"image_url" text,
	"company" text,
	"roles" text DEFAULT '["facilitator"]' NOT NULL,
	"deleted_at" timestamp (3),
	"created_at" timestamp (3) DEFAULT now() NOT NULL,
	"updated_at" timestamp (3) DEFAULT now() NOT NULL,
	CONSTRAINT "users_clerk_user_id_unique" UNIQUE("clerk_user_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "workshop_members" (
	"id" text PRIMARY KEY NOT NULL,
	"workshop_id" text NOT NULL,
	"clerk_user_id" text NOT NULL,
	"role" text NOT NULL,
	"created_at" timestamp (3) DEFAULT now() NOT NULL,
	CONSTRAINT "workshop_members_workshop_user_unique" UNIQUE("workshop_id","clerk_user_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "workshops" (
	"id" text PRIMARY KEY NOT NULL,
	"clerk_user_id" text NOT NULL,
	"title" text NOT NULL,
	"original_idea" text NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"org_id" text,
	"template_id" text,
	"visibility" text DEFAULT 'private' NOT NULL,
	"share_token" text,
	"created_at" timestamp (3) DEFAULT now() NOT NULL,
	"updated_at" timestamp (3) DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "step_definitions" (
	"id" text PRIMARY KEY NOT NULL,
	"order" integer NOT NULL,
	"name" text NOT NULL,
	"description" text NOT NULL,
	"prompt_template" text,
	"created_at" timestamp (3) DEFAULT now() NOT NULL,
	"updated_at" timestamp (3) DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "workshop_steps" (
	"id" text PRIMARY KEY NOT NULL,
	"workshop_id" text NOT NULL,
	"step_id" text NOT NULL,
	"status" text DEFAULT 'not_started' NOT NULL,
	"output" jsonb,
	"started_at" timestamp (3),
	"completed_at" timestamp (3),
	"created_at" timestamp (3) DEFAULT now() NOT NULL,
	"updated_at" timestamp (3) DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "sessions" (
	"id" text PRIMARY KEY NOT NULL,
	"workshop_id" text NOT NULL,
	"started_at" timestamp (3) DEFAULT now() NOT NULL,
	"ended_at" timestamp (3),
	"created_at" timestamp (3) DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "build_packs" (
	"id" text PRIMARY KEY NOT NULL,
	"workshop_id" text NOT NULL,
	"title" text NOT NULL,
	"format_type" text DEFAULT 'markdown' NOT NULL,
	"content" text,
	"created_at" timestamp (3) DEFAULT now() NOT NULL,
	"updated_at" timestamp (3) DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "workshop_members" ADD CONSTRAINT "workshop_members_workshop_id_workshops_id_fk" FOREIGN KEY ("workshop_id") REFERENCES "public"."workshops"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "workshop_steps" ADD CONSTRAINT "workshop_steps_workshop_id_workshops_id_fk" FOREIGN KEY ("workshop_id") REFERENCES "public"."workshops"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "workshop_steps" ADD CONSTRAINT "workshop_steps_step_id_step_definitions_id_fk" FOREIGN KEY ("step_id") REFERENCES "public"."step_definitions"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "sessions" ADD CONSTRAINT "sessions_workshop_id_workshops_id_fk" FOREIGN KEY ("workshop_id") REFERENCES "public"."workshops"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "build_packs" ADD CONSTRAINT "build_packs_workshop_id_workshops_id_fk" FOREIGN KEY ("workshop_id") REFERENCES "public"."workshops"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "users_clerk_user_id_idx" ON "users" USING btree ("clerk_user_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "users_email_idx" ON "users" USING btree ("email");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "workshop_members_workshop_id_idx" ON "workshop_members" USING btree ("workshop_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "workshop_members_clerk_user_id_idx" ON "workshop_members" USING btree ("clerk_user_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "workshops_clerk_user_id_idx" ON "workshops" USING btree ("clerk_user_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "workshops_status_idx" ON "workshops" USING btree ("status");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "workshops_org_id_idx" ON "workshops" USING btree ("org_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "workshop_steps_workshop_id_idx" ON "workshop_steps" USING btree ("workshop_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "workshop_steps_step_id_idx" ON "workshop_steps" USING btree ("step_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "workshop_steps_status_idx" ON "workshop_steps" USING btree ("status");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "sessions_workshop_id_idx" ON "sessions" USING btree ("workshop_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "build_packs_workshop_id_idx" ON "build_packs" USING btree ("workshop_id");
