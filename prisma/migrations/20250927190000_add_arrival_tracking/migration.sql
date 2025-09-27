-- Add arrival tracking fields for birthday reservations
ALTER TABLE "BirthdayReservation"
  ADD COLUMN "hostArrivedAt" TIMESTAMP NULL,
  ADD COLUMN "guestArrivals" INTEGER NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS "BirthdayReservation_hostArrivedAt_idx" ON "BirthdayReservation"("hostArrivedAt");
