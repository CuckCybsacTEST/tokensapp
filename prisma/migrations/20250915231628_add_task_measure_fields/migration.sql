-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_PersonTaskStatus" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "personId" TEXT NOT NULL,
    "taskId" TEXT NOT NULL,
    "day" TEXT NOT NULL,
    "done" BOOLEAN NOT NULL DEFAULT false,
    "measureValue" INTEGER NOT NULL DEFAULT 0,
    "updatedBy" TEXT,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "PersonTaskStatus_updatedBy_fkey" FOREIGN KEY ("updatedBy") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "PersonTaskStatus_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "Task" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "PersonTaskStatus_personId_fkey" FOREIGN KEY ("personId") REFERENCES "Person" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_PersonTaskStatus" ("day", "done", "id", "personId", "taskId", "updatedAt", "updatedBy") SELECT "day", "done", "id", "personId", "taskId", "updatedAt", "updatedBy" FROM "PersonTaskStatus";
DROP TABLE "PersonTaskStatus";
ALTER TABLE "new_PersonTaskStatus" RENAME TO "PersonTaskStatus";
CREATE INDEX "PersonTaskStatus_personId_idx" ON "PersonTaskStatus"("personId");
CREATE INDEX "PersonTaskStatus_taskId_idx" ON "PersonTaskStatus"("taskId");
CREATE INDEX "PersonTaskStatus_day_idx" ON "PersonTaskStatus"("day");
CREATE UNIQUE INDEX "PersonTaskStatus_personId_taskId_day_key" ON "PersonTaskStatus"("personId", "taskId", "day");
CREATE TABLE "new_Task" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "label" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "completed" BOOLEAN NOT NULL DEFAULT false,
    "measureEnabled" BOOLEAN NOT NULL DEFAULT false,
    "targetValue" INTEGER,
    "unitLabel" TEXT,
    "startDay" TEXT,
    "endDay" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "area" TEXT
);
INSERT INTO "new_Task" ("active", "area", "completed", "createdAt", "id", "label", "sortOrder", "updatedAt") SELECT "active", "area", coalesce("completed", false) AS "completed", "createdAt", "id", "label", "sortOrder", "updatedAt" FROM "Task";
DROP TABLE "Task";
ALTER TABLE "new_Task" RENAME TO "Task";
CREATE INDEX "Task_area_idx" ON "Task"("area");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
