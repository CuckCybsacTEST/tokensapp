-- Add isCustom column with default false, non-destructive
ALTER TABLE "BirthdayPack" ADD COLUMN IF NOT EXISTS "isCustom" BOOLEAN NOT NULL DEFAULT false;

-- Backfill: mark existing placeholder by name if present
UPDATE "BirthdayPack" SET "isCustom" = true WHERE lower(name) = 'personalizado';

-- Optional: ensure no duplicate placeholder
-- (No unique constraint added to avoid restricting future designs)
