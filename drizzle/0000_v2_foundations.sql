CREATE SCHEMA "v2";
--> statement-breakpoint
CREATE TABLE "v2"."users" (
	"id" text PRIMARY KEY NOT NULL,
	"clerk_user_id" text NOT NULL,
	"email" text NOT NULL,
	"name" text,
	"avatar_url" text,
	"credit_balance" integer DEFAULT 0 NOT NULL,
	"is_admin" boolean DEFAULT false NOT NULL,
	"free_spend_cap_cents" integer DEFAULT 200 NOT NULL,
	"created_at" timestamp (3) DEFAULT now() NOT NULL,
	"updated_at" timestamp (3) DEFAULT now() NOT NULL,
	"deleted_at" timestamp (3),
	CONSTRAINT "users_clerk_user_id_unique" UNIQUE("clerk_user_id")
);
--> statement-breakpoint
CREATE TABLE "v2"."workshop_members" (
	"id" text PRIMARY KEY NOT NULL,
	"workshop_id" text NOT NULL,
	"user_id" text NOT NULL,
	"role" text DEFAULT 'participant' NOT NULL,
	"joined_at" timestamp (3) DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "v2"."workshops" (
	"id" text PRIMARY KEY NOT NULL,
	"owner_id" text NOT NULL,
	"title" text NOT NULL,
	"idea" text NOT NULL,
	"idea_type" text,
	"stage" text DEFAULT 'setup' NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"state" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"state_seq" integer DEFAULT 0 NOT NULL,
	"test_run_id" text,
	"created_at" timestamp (3) DEFAULT now() NOT NULL,
	"updated_at" timestamp (3) DEFAULT now() NOT NULL,
	"completed_at" timestamp (3),
	"deleted_at" timestamp (3)
);
--> statement-breakpoint
CREATE TABLE "v2"."workshop_events" (
	"id" text PRIMARY KEY NOT NULL,
	"workshop_id" text NOT NULL,
	"seq" integer NOT NULL,
	"actor" text NOT NULL,
	"actor_id" text,
	"type" text NOT NULL,
	"payload" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp (3) DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "v2"."credit_ledger" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"kind" text NOT NULL,
	"delta" integer NOT NULL,
	"balance_after" integer NOT NULL,
	"reference" text,
	"description" text NOT NULL,
	"workshop_id" text,
	"created_at" timestamp (3) DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "v2"."ai_calls" (
	"id" text PRIMARY KEY NOT NULL,
	"workshop_id" text,
	"user_id" text,
	"job" text NOT NULL,
	"model" text NOT NULL,
	"input_tokens" integer,
	"cached_input_tokens" integer,
	"output_tokens" integer,
	"image_count" integer,
	"cost_cents" real DEFAULT 0 NOT NULL,
	"credits_charged" integer DEFAULT 0 NOT NULL,
	"duration_ms" integer,
	"ok" boolean DEFAULT true NOT NULL,
	"error" text,
	"created_at" timestamp (3) DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "v2"."uploads" (
	"id" text PRIMARY KEY NOT NULL,
	"workshop_id" text NOT NULL,
	"user_id" text NOT NULL,
	"kind" text NOT NULL,
	"url" text NOT NULL,
	"content_type" text NOT NULL,
	"size_bytes" integer,
	"width" integer,
	"height" integer,
	"source_id" text,
	"created_at" timestamp (3) DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "v2"."reports" (
	"id" text PRIMARY KEY NOT NULL,
	"workshop_id" text NOT NULL,
	"kind" text NOT NULL,
	"content" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"markdown" text,
	"state_hash" text,
	"created_at" timestamp (3) DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "v2"."test_runs" (
	"id" text PRIMARY KEY NOT NULL,
	"seed" text NOT NULL,
	"status" text DEFAULT 'queued' NOT NULL,
	"scenario" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"report" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"workshop_id" text,
	"triggered_by" text DEFAULT 'nightly' NOT NULL,
	"created_at" timestamp (3) DEFAULT now() NOT NULL,
	"finished_at" timestamp (3)
);
--> statement-breakpoint
CREATE TABLE "v2"."stripe_events" (
	"id" text PRIMARY KEY NOT NULL,
	"type" text NOT NULL,
	"processed_at" timestamp (3) DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "v2"."workshop_members" ADD CONSTRAINT "workshop_members_workshop_id_workshops_id_fk" FOREIGN KEY ("workshop_id") REFERENCES "v2"."workshops"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "v2"."workshop_members" ADD CONSTRAINT "workshop_members_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "v2"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "v2"."workshops" ADD CONSTRAINT "workshops_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "v2"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "v2"."workshop_events" ADD CONSTRAINT "workshop_events_workshop_id_workshops_id_fk" FOREIGN KEY ("workshop_id") REFERENCES "v2"."workshops"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "v2"."credit_ledger" ADD CONSTRAINT "credit_ledger_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "v2"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "v2"."uploads" ADD CONSTRAINT "uploads_workshop_id_workshops_id_fk" FOREIGN KEY ("workshop_id") REFERENCES "v2"."workshops"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "v2"."uploads" ADD CONSTRAINT "uploads_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "v2"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "v2"."reports" ADD CONSTRAINT "reports_workshop_id_workshops_id_fk" FOREIGN KEY ("workshop_id") REFERENCES "v2"."workshops"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "users_email_idx" ON "v2"."users" USING btree ("email");--> statement-breakpoint
CREATE UNIQUE INDEX "workshop_members_unique_idx" ON "v2"."workshop_members" USING btree ("workshop_id","user_id");--> statement-breakpoint
CREATE INDEX "workshop_members_user_idx" ON "v2"."workshop_members" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "workshops_owner_idx" ON "v2"."workshops" USING btree ("owner_id");--> statement-breakpoint
CREATE INDEX "workshops_status_idx" ON "v2"."workshops" USING btree ("status");--> statement-breakpoint
CREATE UNIQUE INDEX "workshop_events_seq_idx" ON "v2"."workshop_events" USING btree ("workshop_id","seq");--> statement-breakpoint
CREATE INDEX "workshop_events_type_idx" ON "v2"."workshop_events" USING btree ("workshop_id","type");--> statement-breakpoint
CREATE INDEX "credit_ledger_user_idx" ON "v2"."credit_ledger" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "credit_ledger_reference_idx" ON "v2"."credit_ledger" USING btree ("kind","reference");--> statement-breakpoint
CREATE INDEX "ai_calls_workshop_idx" ON "v2"."ai_calls" USING btree ("workshop_id");--> statement-breakpoint
CREATE INDEX "ai_calls_user_idx" ON "v2"."ai_calls" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE INDEX "ai_calls_job_idx" ON "v2"."ai_calls" USING btree ("job","created_at");--> statement-breakpoint
CREATE INDEX "uploads_workshop_idx" ON "v2"."uploads" USING btree ("workshop_id");--> statement-breakpoint
CREATE INDEX "reports_workshop_kind_idx" ON "v2"."reports" USING btree ("workshop_id","kind");--> statement-breakpoint
CREATE INDEX "test_runs_created_idx" ON "v2"."test_runs" USING btree ("created_at");