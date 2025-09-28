-- Add functionalDate column to Batch
ALTER TABLE "Batch" ADD COLUMN "functionalDate" TIMESTAMP(3);
-- Index for querying by functionalDate
CREATE INDEX "Batch_functionalDate_idx" ON "Batch"("functionalDate");
