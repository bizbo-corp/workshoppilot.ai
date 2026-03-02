-- Migrate existing sticker/note/hint rows to the unified 'card' variant
UPDATE "canvas_guides" SET "variant" = 'card' WHERE "variant" IN ('sticker', 'note', 'hint');
ALTER TABLE "canvas_guides" ALTER COLUMN "variant" SET DEFAULT 'card';