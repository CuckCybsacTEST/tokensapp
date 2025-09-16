-- Add completed column to Task if not exists
PRAGMA foreign_keys=OFF;

-- SQLite doesn't support IF NOT EXISTS for ADD COLUMN directly; check pragma first in application code normally.
-- We attempt to add and ignore error if it already exists.
ALTER TABLE Task ADD COLUMN completed BOOLEAN DEFAULT 0;

PRAGMA foreign_keys=ON;
