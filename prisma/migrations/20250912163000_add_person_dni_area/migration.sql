-- Add DNI and Area to Person; SQLite-compatible
-- Note: Prisma migrations run once; index creation is IF NOT EXISTS for safety.

-- AlterTable
ALTER TABLE "Person" ADD COLUMN "dni" TEXT;
ALTER TABLE "Person" ADD COLUMN "area" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "Person_dni_key" ON "Person"("dni");
