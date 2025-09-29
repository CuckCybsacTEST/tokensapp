-- AlterTable
ALTER TABLE "Show" ADD COLUMN     "details" TEXT,
ADD COLUMN     "notes" TEXT,
ADD COLUMN     "specialGuests" TEXT;

-- CreateTable
CREATE TABLE "birthdaypack" (
    "id" TEXT NOT NULL,
    "name" TEXT,
    "qrcount" INTEGER NOT NULL,
    "bottle" TEXT NOT NULL,
    "perks" TEXT NOT NULL,
    "active" INTEGER NOT NULL DEFAULT 1,
    "featured" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "birthdaypack_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "birthdaypack_name_key" ON "birthdaypack"("name");
