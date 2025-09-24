-- Baseline migration for Postgres: reflects current Prisma datamodel
-- Generated manually (baseline) - no legacy SQLite artifacts

-- Tables
CREATE TABLE "Prize" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "color" TEXT,
    "description" TEXT,
    "stock" INTEGER,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "emittedTotal" INTEGER NOT NULL DEFAULT 0,
    "lastEmittedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Prize_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Prize_key_key" ON "Prize"("key");

CREATE TABLE "Batch" (
    "id" TEXT NOT NULL,
    "description" TEXT,
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Batch_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Token" (
    "id" TEXT NOT NULL,
    "prizeId" TEXT NOT NULL,
    "batchId" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "redeemedAt" TIMESTAMP(3),
    "signature" TEXT NOT NULL,
    "signatureVersion" INTEGER NOT NULL DEFAULT 1,
    "disabled" BOOLEAN NOT NULL DEFAULT false,
    "revealedAt" TIMESTAMP(3),
    "assignedPrizeId" TEXT,
    "deliveredAt" TIMESTAMP(3),
    "deliveredByUserId" TEXT,
    "deliveryNote" TEXT,
    CONSTRAINT "Token_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "Token_prizeId_fkey" FOREIGN KEY ("prizeId") REFERENCES "Prize"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Token_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "Batch"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Token_assignedPrizeId_fkey" FOREIGN KEY ("assignedPrizeId") REFERENCES "Prize"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE INDEX "Token_prizeId_idx" ON "Token"("prizeId");
CREATE INDEX "Token_batchId_idx" ON "Token"("batchId");
CREATE INDEX "Token_expiresAt_idx" ON "Token"("expiresAt");
CREATE INDEX "Token_redeemedAt_idx" ON "Token"("redeemedAt");
CREATE INDEX "Token_revealedAt_idx" ON "Token"("revealedAt");
CREATE INDEX "Token_deliveredAt_idx" ON "Token"("deliveredAt");
CREATE INDEX "Token_batchId_deliveredAt_idx" ON "Token"("batchId","deliveredAt");

CREATE TABLE "SystemConfig" (
    "id" SERIAL NOT NULL,
    "tokensEnabled" BOOLEAN NOT NULL DEFAULT true,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "SystemConfig_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "EventLog" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "message" TEXT,
    "metadata" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "EventLog_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PrintTemplate" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "filePath" TEXT NOT NULL,
    "meta" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "PrintTemplate_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "PrintTemplate_name_idx" ON "PrintTemplate"("name");

CREATE TABLE "RouletteSession" (
    "id" TEXT NOT NULL,
    "batchId" TEXT NOT NULL,
    "mode" TEXT NOT NULL DEFAULT 'BY_PRIZE',
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "spins" INTEGER NOT NULL DEFAULT 0,
    "maxSpins" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishedAt" TIMESTAMP(3),
    "meta" TEXT NOT NULL,
    CONSTRAINT "RouletteSession_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "RouletteSession_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "Batch"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE INDEX "RouletteSession_batchId_idx" ON "RouletteSession"("batchId");
CREATE INDEX "RouletteSession_status_idx" ON "RouletteSession"("status");

CREATE TABLE "RouletteSpin" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "prizeId" TEXT NOT NULL,
    "tokenId" TEXT,
    "weightSnapshot" INTEGER NOT NULL,
    "order" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "RouletteSpin_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "RouletteSpin_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "RouletteSession"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "RouletteSpin_sessionId_order_key" ON "RouletteSpin"("sessionId","order");
CREATE INDEX "RouletteSpin_sessionId_idx" ON "RouletteSpin"("sessionId");
CREATE INDEX "RouletteSpin_prizeId_idx" ON "RouletteSpin"("prizeId");

CREATE TABLE "Person" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "dni" TEXT,
    "area" TEXT,
    "jobTitle" TEXT,
    CONSTRAINT "Person_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "Person_code_key" ON "Person"("code");
CREATE UNIQUE INDEX "Person_dni_key" ON "Person"("dni");
CREATE INDEX "Person_code_idx" ON "Person"("code");

CREATE TABLE "Scan" (
    "id" TEXT NOT NULL,
    "personId" TEXT NOT NULL,
    "scannedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "type" TEXT NOT NULL DEFAULT 'IN',
    "deviceId" TEXT,
    "byUser" TEXT,
    "meta" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "businessDay" TEXT NOT NULL,
    CONSTRAINT "Scan_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "Scan_personId_fkey" FOREIGN KEY ("personId") REFERENCES "Person"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE INDEX "Scan_personId_idx" ON "Scan"("personId");
CREATE INDEX "Scan_scannedAt_idx" ON "Scan"("scannedAt");
CREATE INDEX "Scan_businessDay_idx" ON "Scan"("businessDay");
CREATE INDEX "Scan_businessDay_personId_type_idx" ON "Scan"("businessDay","personId","type");
CREATE INDEX "Scan_personId_businessDay_idx" ON "Scan"("personId","businessDay");

CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'COLLAB',
    "personId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "User_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "User_personId_fkey" FOREIGN KEY ("personId") REFERENCES "Person"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");
CREATE UNIQUE INDEX "User_personId_key" ON "User"("personId");

CREATE TABLE "Task" (
    "id" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "completed" BOOLEAN NOT NULL DEFAULT false,
    "measureEnabled" BOOLEAN NOT NULL DEFAULT false,
    "targetValue" INTEGER,
    "unitLabel" TEXT,
    "startDay" TEXT,
    "endDay" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "area" TEXT,
    CONSTRAINT "Task_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "Task_area_idx" ON "Task"("area");

CREATE TABLE "PersonTaskStatus" (
    "id" TEXT NOT NULL,
    "personId" TEXT NOT NULL,
    "taskId" TEXT NOT NULL,
    "day" TEXT NOT NULL,
    "done" BOOLEAN NOT NULL DEFAULT false,
    "measureValue" INTEGER NOT NULL DEFAULT 0,
    "updatedBy" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "PersonTaskStatus_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "PersonTaskStatus_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "Task"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "PersonTaskStatus_personId_fkey" FOREIGN KEY ("personId") REFERENCES "Person"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "PersonTaskStatus_updatedBy_fkey" FOREIGN KEY ("updatedBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "PersonTaskStatus_personId_taskId_day_key" ON "PersonTaskStatus"("personId","taskId","day");
CREATE INDEX "PersonTaskStatus_personId_idx" ON "PersonTaskStatus"("personId");
CREATE INDEX "PersonTaskStatus_taskId_idx" ON "PersonTaskStatus"("taskId");
CREATE INDEX "PersonTaskStatus_day_idx" ON "PersonTaskStatus"("day");

CREATE TABLE "BirthdayPack" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "qrCount" INTEGER NOT NULL,
    "bottle" TEXT NOT NULL,
    "perks" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "featured" BOOLEAN NOT NULL DEFAULT false,
    CONSTRAINT "BirthdayPack_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "BirthdayPack_name_key" ON "BirthdayPack"("name");
CREATE INDEX "BirthdayPack_active_idx" ON "BirthdayPack"("active");
CREATE INDEX "BirthdayPack_featured_idx" ON "BirthdayPack"("featured");

CREATE TABLE "BirthdayReservation" (
    "id" TEXT NOT NULL,
    "celebrantName" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "documento" TEXT NOT NULL,
    "email" TEXT,
    "date" TIMESTAMP(3) NOT NULL,
    "timeSlot" TEXT NOT NULL,
    "packId" TEXT NOT NULL,
    "guestsPlanned" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "tokensGeneratedAt" TIMESTAMP(3),
    "createdBy" TEXT,
    "updatedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "BirthdayReservation_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "BirthdayReservation_packId_fkey" FOREIGN KEY ("packId") REFERENCES "BirthdayPack"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE INDEX "BirthdayReservation_packId_idx" ON "BirthdayReservation"("packId");
CREATE INDEX "BirthdayReservation_date_timeSlot_idx" ON "BirthdayReservation"("date","timeSlot");
CREATE INDEX "BirthdayReservation_status_idx" ON "BirthdayReservation"("status");

CREATE TABLE "InviteToken" (
    "id" TEXT NOT NULL,
    "reservationId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "kind" TEXT NOT NULL DEFAULT 'guest',
    "status" TEXT NOT NULL DEFAULT 'unclaimed',
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "claim" TEXT NOT NULL,
    "metadata" TEXT,
    "usedCount" INTEGER NOT NULL DEFAULT 0,
    "maxUses" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "InviteToken_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "InviteToken_reservationId_fkey" FOREIGN KEY ("reservationId") REFERENCES "BirthdayReservation"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "InviteToken_code_key" ON "InviteToken"("code");
CREATE INDEX "InviteToken_reservationId_idx" ON "InviteToken"("reservationId");
CREATE INDEX "InviteToken_status_idx" ON "InviteToken"("status");
CREATE INDEX "InviteToken_expiresAt_idx" ON "InviteToken"("expiresAt");

CREATE TABLE "TokenRedemption" (
    "id" TEXT NOT NULL,
    "tokenId" TEXT NOT NULL,
    "redeemedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "by" TEXT,
    "device" TEXT,
    "location" TEXT,
    "reservationId" TEXT,
    CONSTRAINT "TokenRedemption_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "TokenRedemption_tokenId_fkey" FOREIGN KEY ("tokenId") REFERENCES "InviteToken"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "TokenRedemption_reservationId_fkey" FOREIGN KEY ("reservationId") REFERENCES "BirthdayReservation"("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE INDEX "TokenRedemption_tokenId_idx" ON "TokenRedemption"("tokenId");
CREATE INDEX "TokenRedemption_redeemedAt_idx" ON "TokenRedemption"("redeemedAt");
CREATE INDEX "TokenRedemption_reservationId_idx" ON "TokenRedemption"("reservationId");

CREATE TABLE "CourtesyItem" (
    "id" TEXT NOT NULL,
    "reservationId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "CourtesyItem_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "CourtesyItem_reservationId_fkey" FOREIGN KEY ("reservationId") REFERENCES "BirthdayReservation"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE INDEX "CourtesyItem_reservationId_idx" ON "CourtesyItem"("reservationId");
CREATE INDEX "CourtesyItem_type_idx" ON "CourtesyItem"("type");
CREATE INDEX "CourtesyItem_status_idx" ON "CourtesyItem"("status");

CREATE TABLE "PhotoDeliverable" (
    "id" TEXT NOT NULL,
    "reservationId" TEXT NOT NULL,
    "kind" TEXT NOT NULL DEFAULT 'group',
    "url" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "PhotoDeliverable_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "PhotoDeliverable_reservationId_fkey" FOREIGN KEY ("reservationId") REFERENCES "BirthdayReservation"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE INDEX "PhotoDeliverable_reservationId_idx" ON "PhotoDeliverable"("reservationId");
CREATE INDEX "PhotoDeliverable_status_idx" ON "PhotoDeliverable"("status");

-- Partial unique indexes for attendance (business day uniqueness per IN/OUT)
CREATE UNIQUE INDEX "Scan_person_businessDay_in_unique" ON "Scan"("personId","businessDay","type") WHERE "type"='IN';
CREATE UNIQUE INDEX "Scan_person_businessDay_out_unique" ON "Scan"("personId","businessDay","type") WHERE "type"='OUT';
