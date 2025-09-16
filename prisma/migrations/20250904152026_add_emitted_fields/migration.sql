-- CreateTable
CREATE TABLE "Prize" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "key" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "color" TEXT,
    "description" TEXT,
    "stock" INTEGER,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "emittedTotal" INTEGER NOT NULL DEFAULT 0,
    "lastEmittedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Batch" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "description" TEXT,
    "createdBy" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "Token" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "prizeId" TEXT NOT NULL,
    "batchId" TEXT NOT NULL,
    "expiresAt" DATETIME NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "redeemedAt" DATETIME,
    "signature" TEXT NOT NULL,
    "signatureVersion" INTEGER NOT NULL DEFAULT 1,
    "disabled" BOOLEAN NOT NULL DEFAULT false,
    CONSTRAINT "Token_prizeId_fkey" FOREIGN KEY ("prizeId") REFERENCES "Prize" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Token_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "Batch" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "SystemConfig" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT DEFAULT 1,
    "tokensEnabled" BOOLEAN NOT NULL DEFAULT true,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "EventLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "type" TEXT NOT NULL,
    "message" TEXT,
    "metadata" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE UNIQUE INDEX "Prize_key_key" ON "Prize"("key");

-- CreateIndex
CREATE INDEX "Token_prizeId_idx" ON "Token"("prizeId");

-- CreateIndex
CREATE INDEX "Token_batchId_idx" ON "Token"("batchId");

-- CreateIndex
CREATE INDEX "Token_expiresAt_idx" ON "Token"("expiresAt");

-- CreateIndex
CREATE INDEX "Token_redeemedAt_idx" ON "Token"("redeemedAt");
