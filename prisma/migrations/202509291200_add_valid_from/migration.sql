-- Add validFrom column to Token for hourly windows
ALTER TABLE "Token" ADD COLUMN "validFrom" TIMESTAMP(3);
CREATE INDEX "Token_validFrom_idx" ON "Token"("validFrom");
