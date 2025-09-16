-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_InviteToken" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "reservationId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "kind" TEXT NOT NULL DEFAULT 'guest',
    "status" TEXT NOT NULL DEFAULT 'unclaimed',
    "expiresAt" DATETIME NOT NULL,
    "claim" TEXT NOT NULL,
    "metadata" TEXT,
    "usedCount" INTEGER NOT NULL DEFAULT 0,
    "maxUses" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "InviteToken_reservationId_fkey" FOREIGN KEY ("reservationId") REFERENCES "BirthdayReservation" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_InviteToken" ("claim", "code", "createdAt", "expiresAt", "id", "kind", "metadata", "reservationId", "status") SELECT "claim", "code", "createdAt", "expiresAt", "id", "kind", "metadata", "reservationId", "status" FROM "InviteToken";
DROP TABLE "InviteToken";
ALTER TABLE "new_InviteToken" RENAME TO "InviteToken";
CREATE UNIQUE INDEX "InviteToken_code_key" ON "InviteToken"("code");
CREATE INDEX "InviteToken_reservationId_idx" ON "InviteToken"("reservationId");
CREATE INDEX "InviteToken_status_idx" ON "InviteToken"("status");
CREATE INDEX "InviteToken_expiresAt_idx" ON "InviteToken"("expiresAt");
CREATE TABLE "new_SystemConfig" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "tokensEnabled" BOOLEAN NOT NULL DEFAULT true,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_SystemConfig" ("id", "tokensEnabled", "updatedAt") SELECT "id", "tokensEnabled", "updatedAt" FROM "SystemConfig";
DROP TABLE "SystemConfig";
ALTER TABLE "new_SystemConfig" RENAME TO "SystemConfig";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
