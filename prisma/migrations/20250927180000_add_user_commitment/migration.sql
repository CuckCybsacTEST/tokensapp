-- Add commitment acknowledgment fields to User
ALTER TABLE "User"
ADD COLUMN "commitmentVersionAccepted" INT NOT NULL DEFAULT 0,
ADD COLUMN "commitmentAcceptedAt" TIMESTAMP NULL;

-- Optional: future index if querying who hasn't accepted latest version
CREATE INDEX IF NOT EXISTS "idx_user_commitment_version" ON "User" ("commitmentVersionAccepted");