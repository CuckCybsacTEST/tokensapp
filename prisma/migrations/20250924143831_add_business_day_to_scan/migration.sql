-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Scan" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "personId" TEXT NOT NULL,
    "scannedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "type" TEXT NOT NULL DEFAULT 'IN',
    "deviceId" TEXT,
    "byUser" TEXT,
    "meta" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "businessDay" TEXT NOT NULL DEFAULT '',
    CONSTRAINT "Scan_personId_fkey" FOREIGN KEY ("personId") REFERENCES "Person" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Scan" ("byUser", "createdAt", "deviceId", "id", "meta", "personId", "scannedAt", "type") SELECT "byUser", "createdAt", "deviceId", "id", "meta", "personId", "scannedAt", "type" FROM "Scan";
DROP TABLE "Scan";
ALTER TABLE "new_Scan" RENAME TO "Scan";
CREATE INDEX "Scan_personId_idx" ON "Scan"("personId");
CREATE INDEX "Scan_scannedAt_idx" ON "Scan"("scannedAt");
CREATE INDEX "Scan_businessDay_idx" ON "Scan"("businessDay");
CREATE INDEX "Scan_businessDay_personId_type_idx" ON "Scan"("businessDay", "personId", "type");
CREATE INDEX "Scan_personId_businessDay_idx" ON "Scan"("personId", "businessDay");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
