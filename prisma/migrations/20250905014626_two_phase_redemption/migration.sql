-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Token" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "prizeId" TEXT NOT NULL,
    "batchId" TEXT NOT NULL,
    "expiresAt" DATETIME NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "redeemedAt" DATETIME,
    "signature" TEXT NOT NULL,
    "signatureVersion" INTEGER NOT NULL DEFAULT 1,
    "disabled" BOOLEAN NOT NULL DEFAULT false,
    "revealedAt" DATETIME,
    "assignedPrizeId" TEXT,
    "deliveredAt" DATETIME,
    "deliveredByUserId" TEXT,
    "deliveryNote" TEXT,
    CONSTRAINT "Token_prizeId_fkey" FOREIGN KEY ("prizeId") REFERENCES "Prize" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Token_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "Batch" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Token_assignedPrizeId_fkey" FOREIGN KEY ("assignedPrizeId") REFERENCES "Prize" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Token" ("batchId", "createdAt", "disabled", "expiresAt", "id", "prizeId", "redeemedAt", "signature", "signatureVersion") SELECT "batchId", "createdAt", "disabled", "expiresAt", "id", "prizeId", "redeemedAt", "signature", "signatureVersion" FROM "Token";
DROP TABLE "Token";
ALTER TABLE "new_Token" RENAME TO "Token";
CREATE INDEX "Token_prizeId_idx" ON "Token"("prizeId");
CREATE INDEX "Token_batchId_idx" ON "Token"("batchId");
CREATE INDEX "Token_expiresAt_idx" ON "Token"("expiresAt");
CREATE INDEX "Token_redeemedAt_idx" ON "Token"("redeemedAt");
CREATE INDEX "Token_revealedAt_idx" ON "Token"("revealedAt");
CREATE INDEX "Token_deliveredAt_idx" ON "Token"("deliveredAt");
CREATE INDEX "Token_batchId_deliveredAt_idx" ON "Token"("batchId", "deliveredAt");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
