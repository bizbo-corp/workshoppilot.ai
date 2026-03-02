CREATE TABLE "asset_library" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"blob_url" text NOT NULL,
	"inline_svg" text,
	"mime_type" text NOT NULL,
	"file_size" integer,
	"width" integer,
	"height" integer,
	"category" text DEFAULT 'sticker' NOT NULL,
	"tags" text,
	"usage_count" integer DEFAULT 0 NOT NULL,
	"uploaded_by" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "canvas_guides" ADD COLUMN "library_asset_id" text;--> statement-breakpoint
CREATE INDEX "asset_library_category_idx" ON "asset_library" USING btree ("category");--> statement-breakpoint
CREATE INDEX "asset_library_name_idx" ON "asset_library" USING btree ("name");--> statement-breakpoint
CREATE INDEX "asset_library_created_at_idx" ON "asset_library" USING btree ("created_at");