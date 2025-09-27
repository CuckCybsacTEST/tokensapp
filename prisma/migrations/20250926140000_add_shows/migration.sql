-- Migration for Shows (flyers)
-- Creates enum ShowStatus, table Show, indexes and constraints

-- Enum
CREATE TYPE "ShowStatus" AS ENUM ('DRAFT','PUBLISHED','ARCHIVED');

-- Table
CREATE TABLE "Show" (
  "id" TEXT NOT NULL,
  "title" VARCHAR(120) NOT NULL,
  "slug" VARCHAR(140) NOT NULL,
  "status" "ShowStatus" NOT NULL DEFAULT 'DRAFT',
  "startsAt" TIMESTAMP(3) NOT NULL,
  "endsAt" TIMESTAMP(3),
  "slot" SMALLINT,
  "imageOriginalPath" TEXT NOT NULL,
  "imageWebpPath" TEXT NOT NULL,
  "imageBlurData" TEXT NOT NULL,
  "width" INTEGER NOT NULL,
  "height" INTEGER NOT NULL,
  "bytesOriginal" INTEGER NOT NULL,
  "bytesOptimized" INTEGER NOT NULL,
  "publishedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Show_pkey" PRIMARY KEY ("id")
);

-- Unique slug
CREATE UNIQUE INDEX "Show_slug_key" ON "Show"("slug");

-- Composite index for status + startsAt desc
CREATE INDEX "Show_status_startsAt_idx" ON "Show"("status", "startsAt" DESC);

-- Partial unique index: slot uniqueness only for published shows (PostgreSQL only)
CREATE UNIQUE INDEX IF NOT EXISTS shows_slot_published_unique ON "Show" (slot) WHERE status = 'PUBLISHED';

-- Optional more compact ordering index (only published)
CREATE INDEX IF NOT EXISTS shows_published_order ON "Show" ("startsAt" DESC) WHERE status = 'PUBLISHED';

-- CHECK constraints
ALTER TABLE "Show" ADD CONSTRAINT show_slot_range CHECK (slot IS NULL OR (slot BETWEEN 1 AND 4));
ALTER TABLE "Show" ADD CONSTRAINT show_time_range CHECK ("endsAt" IS NULL OR "endsAt" > "startsAt");

-- NOTE: Business rules not enforceable purely via DDL:
--  * Max 4 published shows simultaneously
--  * No overlap of active windows among non-slotted published shows
--  * publishedAt must be set when transitioning to PUBLISHED
-- These are enforced in application logic.
