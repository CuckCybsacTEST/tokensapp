-- Agregar columna referrerId a birthday_reservation
ALTER TABLE "birthday_reservation" ADD COLUMN "referrerId" TEXT;

-- Crear tabla birthday_referrer
CREATE TABLE "birthday_referrer" (
    "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL UNIQUE,
    "code" TEXT NOT NULL UNIQUE,
    "email" TEXT,
    "phone" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Crear índices
CREATE INDEX "birthday_reservation_referrerId_idx" ON "birthday_reservation"("referrerId");
CREATE INDEX "birthday_referrer_slug_idx" ON "birthday_referrer"("slug");
CREATE INDEX "birthday_referrer_active_idx" ON "birthday_referrer"("active");

-- Agregar foreign key constraint
ALTER TABLE "birthday_reservation" ADD CONSTRAINT "birthday_reservation_referrerId_fkey" FOREIGN KEY ("referrerId") REFERENCES "birthday_referrer"("id") ON DELETE SET NULL ON UPDATE CASCADE;