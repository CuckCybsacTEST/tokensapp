-- Add ingestedAt column to Token for operational daily metrics
ALTER TABLE "Token" ADD COLUMN IF NOT EXISTS "ingestedAt" TIMESTAMP(3) NOT NULL DEFAULT NOW();

-- Backfill existing rows where null (should not be null due to default, but for safety)
UPDATE "Token" SET "ingestedAt" = COALESCE("ingestedAt", "createdAt");

CREATE INDEX IF NOT EXISTS "Token_ingestedAt_idx" ON "Token"("ingestedAt");
