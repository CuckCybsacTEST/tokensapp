-- CreateTable
CREATE TABLE "RouletteSession" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "batchId" TEXT NOT NULL,
    "mode" TEXT NOT NULL DEFAULT 'BY_PRIZE',
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "spins" INTEGER NOT NULL DEFAULT 0,
    "maxSpins" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishedAt" DATETIME,
    "meta" TEXT NOT NULL,
    CONSTRAINT "RouletteSession_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "Batch" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "RouletteSpin" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "sessionId" TEXT NOT NULL,
    "prizeId" TEXT NOT NULL,
    "tokenId" TEXT,
    "weightSnapshot" INTEGER NOT NULL,
    "order" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "RouletteSpin_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "RouletteSession" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "RouletteSession_batchId_idx" ON "RouletteSession"("batchId");

-- CreateIndex
CREATE INDEX "RouletteSession_status_idx" ON "RouletteSession"("status");

-- CreateIndex
CREATE INDEX "RouletteSpin_sessionId_idx" ON "RouletteSpin"("sessionId");

-- CreateIndex
CREATE INDEX "RouletteSpin_prizeId_idx" ON "RouletteSpin"("prizeId");

-- CreateIndex
CREATE UNIQUE INDEX "RouletteSpin_sessionId_order_key" ON "RouletteSpin"("sessionId", "order");
