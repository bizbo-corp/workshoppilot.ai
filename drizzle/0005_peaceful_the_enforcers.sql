CREATE TABLE "canvas_guides" (
	"id" text PRIMARY KEY NOT NULL,
	"step_id" text NOT NULL,
	"title" text,
	"body" text NOT NULL,
	"variant" text DEFAULT 'sticker' NOT NULL,
	"color" text,
	"layer" text DEFAULT 'foreground' NOT NULL,
	"placement_mode" text DEFAULT 'pinned' NOT NULL,
	"pinned_position" text,
	"canvas_x" integer,
	"canvas_y" integer,
	"dismiss_behavior" text DEFAULT 'hover-x' NOT NULL,
	"show_only_when_empty" boolean DEFAULT false NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"image_url" text,
	"image_svg" text,
	"image_position" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "canvas_guides_step_id_idx" ON "canvas_guides" USING btree ("step_id");--> statement-breakpoint
CREATE INDEX "canvas_guides_step_sort_idx" ON "canvas_guides" USING btree ("step_id","sort_order");