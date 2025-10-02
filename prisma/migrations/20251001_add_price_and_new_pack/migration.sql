-- Add priceSoles column to BirthdayPack
ALTER TABLE "BirthdayPack" ADD COLUMN IF NOT EXISTS "priceSoles" INTEGER NOT NULL DEFAULT 0;

-- Optionally backfill existing packs with a neutral value (0 means no precio definido)
UPDATE "BirthdayPack" SET "priceSoles" = 0 WHERE "priceSoles" IS NULL;

-- Insert new default pack if it does not exist yet (Galaxia)
INSERT INTO "BirthdayPack" ("id","name","qrCount","bottle","perks","active","featured","priceSoles")
SELECT gen_random_uuid(), 'Galaxia', 30, 'Black Label',
       '["Botella de cortesía: Black Label","30 QRs cumpleañero","5 fotos impresas","Acceso VIP","Collares neón"]',
       true, true, 120
WHERE NOT EXISTS (SELECT 1 FROM "BirthdayPack" WHERE lower("name") = lower('Galaxia'));