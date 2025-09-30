-- Add staticTargetUrl column to Batch
ALTER TABLE "Batch" ADD COLUMN "staticTargetUrl" TEXT;
CREATE INDEX "Batch_staticTargetUrl_idx" ON "Batch"("staticTargetUrl");
