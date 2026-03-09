ALTER TABLE "ai_usage_events" ADD COLUMN "item_id" text;--> statement-breakpoint
CREATE INDEX "ai_usage_events_item_id_idx" ON "ai_usage_events" USING btree ("item_id");