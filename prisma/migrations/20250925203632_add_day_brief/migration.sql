-- CreateTable
CREATE TABLE "DayBrief" (
    "id" TEXT NOT NULL,
    "day" TEXT NOT NULL,
    "title" TEXT,
    "show" TEXT,
    "promos" TEXT,
    "notes" TEXT,
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DayBrief_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "DayBrief_day_key" ON "DayBrief"("day");

-- CreateIndex
CREATE INDEX "DayBrief_day_idx" ON "DayBrief"("day");
