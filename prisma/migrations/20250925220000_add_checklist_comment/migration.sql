-- Create table for optional collaborator comments on checklist
CREATE TABLE IF NOT EXISTS "ChecklistComment" (
  "id" TEXT PRIMARY KEY,
  "userId" TEXT NOT NULL,
  "day" TEXT NOT NULL,
  "text" TEXT NOT NULL,
  "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ChecklistComment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "ChecklistComment_userId_idx" ON "ChecklistComment" ("userId");
CREATE INDEX IF NOT EXISTS "ChecklistComment_day_idx" ON "ChecklistComment" ("day");
