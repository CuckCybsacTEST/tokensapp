-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_SystemConfig" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT DEFAULT 1,
    "tokensEnabled" BOOLEAN NOT NULL DEFAULT true,
    "tokensTestMode" BOOLEAN NOT NULL DEFAULT false,
    "tokensAdminDisabled" BOOLEAN NOT NULL DEFAULT false,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_SystemConfig" ("id", "tokensEnabled", "updatedAt") SELECT "id", "tokensEnabled", "updatedAt" FROM "SystemConfig";
DROP TABLE "SystemConfig";
ALTER TABLE "new_SystemConfig" RENAME TO "SystemConfig";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
