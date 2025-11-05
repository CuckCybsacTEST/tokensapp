-- CreateTable
CREATE TABLE "TicketPackage" (
    "id" TEXT NOT NULL,
    "ticketPurchaseId" TEXT NOT NULL,
    "ticketTypeId" TEXT NOT NULL,
    "qrCode" TEXT NOT NULL,
    "qrDataUrl" TEXT,
    "totalTickets" INTEGER NOT NULL,
    "usedTickets" INTEGER NOT NULL DEFAULT 0,
    "customerDni" TEXT NOT NULL,
    "customerName" TEXT NOT NULL,
    "customerPhone" TEXT NOT NULL,
    "status" "PurchaseStatus" NOT NULL DEFAULT 'CONFIRMED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TicketPackage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "TicketPackage_ticketPurchaseId_key" ON "TicketPackage"("ticketPurchaseId");

-- CreateIndex
CREATE UNIQUE INDEX "TicketPackage_qrCode_key" ON "TicketPackage"("qrCode");

-- CreateIndex
CREATE INDEX "TicketPackage_ticketPurchaseId_idx" ON "TicketPackage"("ticketPurchaseId");

-- CreateIndex
CREATE INDEX "TicketPackage_qrCode_idx" ON "TicketPackage"("qrCode");

-- CreateIndex
CREATE INDEX "TicketPackage_status_idx" ON "TicketPackage"("status");

-- AddForeignKey
ALTER TABLE "TicketPackage" ADD CONSTRAINT "TicketPackage_ticketPurchaseId_fkey" FOREIGN KEY ("ticketPurchaseId") REFERENCES "TicketPurchase"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TicketPackage" ADD CONSTRAINT "TicketPackage_ticketTypeId_fkey" FOREIGN KEY ("ticketTypeId") REFERENCES "TicketType"("id") ON DELETE CASCADE ON UPDATE CASCADE;
