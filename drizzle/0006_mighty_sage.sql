CREATE TABLE "step_canvas_settings" (
	"id" text PRIMARY KEY NOT NULL,
	"step_id" text NOT NULL,
	"default_zoom" real DEFAULT 1 NOT NULL,
	"default_x" integer DEFAULT 0 NOT NULL,
	"default_y" integer DEFAULT 0 NOT NULL,
	"viewport_mode" text DEFAULT 'center-offset' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "step_canvas_settings_step_id_unique" UNIQUE("step_id")
);
--> statement-breakpoint
ALTER TABLE "canvas_guides" ADD COLUMN "width" integer;--> statement-breakpoint
ALTER TABLE "canvas_guides" ADD COLUMN "height" integer;--> statement-breakpoint
ALTER TABLE "canvas_guides" ADD COLUMN "rotation" integer;