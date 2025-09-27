-- Add whatsapp (text) and birthday (date) to Person
ALTER TABLE "Person"
ADD COLUMN "whatsapp" TEXT NULL,
ADD COLUMN "birthday" TIMESTAMP NULL;

-- Optional: index for birthday month/day queries (functional index Postgres)
-- This is useful if we later query upcoming birthdays. Safe to ignore if not needed.
-- CREATE INDEX IF NOT EXISTS "person_birthday_month_day_idx" ON "Person" ((date_part('month', "birthday")), (date_part('day', "birthday"))) WHERE "birthday" IS NOT NULL;
