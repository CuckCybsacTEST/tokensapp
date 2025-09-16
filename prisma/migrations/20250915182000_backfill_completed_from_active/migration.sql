-- Backfill: tasks that were inactive become completed
PRAGMA foreign_keys=OFF;
-- Mark completed = 1 where active = 0
UPDATE Task SET completed = 1 WHERE active = 0;
-- Optionally set active = 1 to keep visibility consistent
-- UPDATE Task SET active = 1 WHERE active = 0;
PRAGMA foreign_keys=ON;
