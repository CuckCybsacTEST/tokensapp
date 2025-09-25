-- Comments per task/day by collaborators
CREATE TABLE IF NOT EXISTS "TaskComment" (
  "id" TEXT PRIMARY KEY,
  "userId" TEXT NOT NULL,
  "taskId" TEXT NOT NULL,
  "day" TEXT NOT NULL,
  "text" TEXT NOT NULL,
  "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "TaskComment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "TaskComment_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "Task"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "TaskComment_userId_idx" ON "TaskComment" ("userId");
CREATE INDEX IF NOT EXISTS "TaskComment_taskId_day_idx" ON "TaskComment" ("taskId","day");
CREATE INDEX IF NOT EXISTS "TaskComment_day_idx" ON "TaskComment" ("day");
-- Per-task checklist comments from collaborators
CREATE TABLE IF NOT EXISTS "ChecklistTaskComment" (
  "id" TEXT PRIMARY KEY,
  "userId" TEXT NOT NULL,
  "taskId" TEXT NOT NULL,
  "day" TEXT NOT NULL,
  "text" TEXT NOT NULL,
  "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ChecklistTaskComment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "ChecklistTaskComment_userId_idx" ON "ChecklistTaskComment" ("userId");
CREATE INDEX IF NOT EXISTS "ChecklistTaskComment_day_idx" ON "ChecklistTaskComment" ("day");
CREATE INDEX IF NOT EXISTS "ChecklistTaskComment_task_idx" ON "ChecklistTaskComment" ("taskId");
