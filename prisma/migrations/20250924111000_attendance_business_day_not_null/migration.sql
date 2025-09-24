-- Make businessDay NOT NULL (assumes backfill already populated all rows)
-- Preserve existing data
PRAGMA foreign_keys=OFF;

CREATE TABLE "_Scan_new" (
  "id" TEXT PRIMARY KEY,
  "personId" TEXT NOT NULL,
  "scannedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "type" TEXT NOT NULL DEFAULT 'IN',
  "deviceId" TEXT,
  "byUser" TEXT,
  "meta" TEXT,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "businessDay" TEXT NOT NULL,
  FOREIGN KEY ("personId") REFERENCES "Person" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

INSERT INTO "_Scan_new" (id, personId, scannedAt, type, deviceId, byUser, meta, createdAt, businessDay)
  SELECT id, personId, scannedAt, type, deviceId, byUser, meta, createdAt,
         CASE WHEN businessDay IS NULL OR businessDay = '' THEN substr(scannedAt,1,10) ELSE businessDay END
  FROM Scan;

DROP TABLE Scan;
ALTER TABLE "_Scan_new" RENAME TO "Scan";

-- Indexes (re-create existing ones)
CREATE INDEX "Scan_personId_idx" ON "Scan"("personId");
CREATE INDEX "Scan_scannedAt_idx" ON "Scan"("scannedAt");
CREATE INDEX "Scan_businessDay_idx" ON "Scan"("businessDay");
CREATE INDEX "Scan_businessDay_personId_type_idx" ON "Scan"("businessDay","personId","type");
CREATE INDEX "Scan_personId_businessDay_idx" ON "Scan"("personId","businessDay");

-- Partial uniqueness for single IN / OUT per business day
CREATE UNIQUE INDEX "Scan_person_businessDay_in_unique" ON "Scan"("personId","businessDay","type") WHERE type='IN';
CREATE UNIQUE INDEX "Scan_person_businessDay_out_unique" ON "Scan"("personId","businessDay","type") WHERE type='OUT';

PRAGMA foreign_keys=ON;