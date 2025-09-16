-- AlterTable
ALTER TABLE "Task" ADD COLUMN "area" TEXT;

-- CreateTable
CREATE TABLE "BirthdayPack" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "qrCount" INTEGER NOT NULL,
    "bottle" TEXT NOT NULL,
    "perks" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "featured" BOOLEAN NOT NULL DEFAULT false
);

-- CreateTable
CREATE TABLE "BirthdayReservation" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "celebrantName" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "documento" TEXT NOT NULL,
    "email" TEXT,
    "date" DATETIME NOT NULL,
    "timeSlot" TEXT NOT NULL,
    "packId" TEXT NOT NULL,
    "guestsPlanned" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "tokensGeneratedAt" DATETIME,
    "createdBy" TEXT,
    "updatedBy" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "BirthdayReservation_packId_fkey" FOREIGN KEY ("packId") REFERENCES "BirthdayPack" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "InviteToken" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "reservationId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "kind" TEXT NOT NULL DEFAULT 'guest',
    "status" TEXT NOT NULL DEFAULT 'unclaimed',
    "expiresAt" DATETIME NOT NULL,
    "claim" TEXT NOT NULL,
    "metadata" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "InviteToken_reservationId_fkey" FOREIGN KEY ("reservationId") REFERENCES "BirthdayReservation" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "TokenRedemption" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tokenId" TEXT NOT NULL,
    "redeemedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "by" TEXT,
    "device" TEXT,
    "location" TEXT,
    "reservationId" TEXT,
    CONSTRAINT "TokenRedemption_tokenId_fkey" FOREIGN KEY ("tokenId") REFERENCES "InviteToken" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "TokenRedemption_reservationId_fkey" FOREIGN KEY ("reservationId") REFERENCES "BirthdayReservation" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "CourtesyItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "reservationId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "CourtesyItem_reservationId_fkey" FOREIGN KEY ("reservationId") REFERENCES "BirthdayReservation" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "PhotoDeliverable" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "reservationId" TEXT NOT NULL,
    "kind" TEXT NOT NULL DEFAULT 'group',
    "url" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "PhotoDeliverable_reservationId_fkey" FOREIGN KEY ("reservationId") REFERENCES "BirthdayReservation" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "BirthdayPack_active_idx" ON "BirthdayPack"("active");

-- CreateIndex
CREATE INDEX "BirthdayPack_featured_idx" ON "BirthdayPack"("featured");

-- CreateIndex
CREATE INDEX "BirthdayReservation_packId_idx" ON "BirthdayReservation"("packId");

-- CreateIndex
CREATE INDEX "BirthdayReservation_date_timeSlot_idx" ON "BirthdayReservation"("date", "timeSlot");

-- CreateIndex
CREATE INDEX "BirthdayReservation_status_idx" ON "BirthdayReservation"("status");

-- CreateIndex
CREATE UNIQUE INDEX "InviteToken_code_key" ON "InviteToken"("code");

-- CreateIndex
CREATE INDEX "InviteToken_reservationId_idx" ON "InviteToken"("reservationId");

-- CreateIndex
CREATE INDEX "InviteToken_status_idx" ON "InviteToken"("status");

-- CreateIndex
CREATE INDEX "InviteToken_expiresAt_idx" ON "InviteToken"("expiresAt");

-- CreateIndex
CREATE INDEX "TokenRedemption_tokenId_idx" ON "TokenRedemption"("tokenId");

-- CreateIndex
CREATE INDEX "TokenRedemption_redeemedAt_idx" ON "TokenRedemption"("redeemedAt");

-- CreateIndex
CREATE INDEX "TokenRedemption_reservationId_idx" ON "TokenRedemption"("reservationId");

-- CreateIndex
CREATE INDEX "CourtesyItem_reservationId_idx" ON "CourtesyItem"("reservationId");

-- CreateIndex
CREATE INDEX "CourtesyItem_type_idx" ON "CourtesyItem"("type");

-- CreateIndex
CREATE INDEX "CourtesyItem_status_idx" ON "CourtesyItem"("status");

-- CreateIndex
CREATE INDEX "PhotoDeliverable_reservationId_idx" ON "PhotoDeliverable"("reservationId");

-- CreateIndex
CREATE INDEX "PhotoDeliverable_status_idx" ON "PhotoDeliverable"("status");

-- CreateIndex
CREATE INDEX "Task_area_idx" ON "Task"("area");
