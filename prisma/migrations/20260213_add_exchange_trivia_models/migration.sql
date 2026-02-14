-- CreateTable
CREATE TABLE "ExchangeTriviaSet" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ExchangeTriviaSet_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExchangeTriviaQuestion" (
    "id" TEXT NOT NULL,
    "setId" TEXT NOT NULL,
    "question" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "pointsForCorrect" INTEGER NOT NULL DEFAULT 10,
    "pointsForIncorrect" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "ExchangeTriviaQuestion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExchangeTriviaAnswer" (
    "id" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "answer" TEXT NOT NULL,
    "isCorrect" BOOLEAN NOT NULL DEFAULT false,
    "order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "ExchangeTriviaAnswer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExchangeTriviaSession" (
    "id" TEXT NOT NULL,
    "setId" TEXT NOT NULL,
    "currentQuestionIndex" INTEGER NOT NULL DEFAULT 0,
    "completed" BOOLEAN NOT NULL DEFAULT false,
    "totalPoints" INTEGER NOT NULL DEFAULT 0,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "ExchangeTriviaSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExchangeTriviaProgress" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "selectedAnswerId" TEXT NOT NULL,
    "isCorrect" BOOLEAN NOT NULL DEFAULT false,
    "answeredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ExchangeTriviaProgress_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ExchangeTriviaSet_active_idx" ON "ExchangeTriviaSet"("active");

-- CreateIndex
CREATE INDEX "ExchangeTriviaQuestion_setId_idx" ON "ExchangeTriviaQuestion"("setId");

-- CreateIndex
CREATE INDEX "ExchangeTriviaQuestion_order_idx" ON "ExchangeTriviaQuestion"("order");

-- CreateIndex
CREATE INDEX "ExchangeTriviaAnswer_questionId_idx" ON "ExchangeTriviaAnswer"("questionId");

-- CreateIndex
CREATE INDEX "ExchangeTriviaSession_setId_idx" ON "ExchangeTriviaSession"("setId");

-- CreateIndex
CREATE INDEX "ExchangeTriviaSession_completed_idx" ON "ExchangeTriviaSession"("completed");

-- CreateIndex
CREATE UNIQUE INDEX "ExchangeTriviaProgress_sessionId_questionId_key" ON "ExchangeTriviaProgress"("sessionId", "questionId");

-- CreateIndex
CREATE INDEX "ExchangeTriviaProgress_sessionId_idx" ON "ExchangeTriviaProgress"("sessionId");

-- AddForeignKey
ALTER TABLE "ExchangeTriviaQuestion" ADD CONSTRAINT "ExchangeTriviaQuestion_setId_fkey" FOREIGN KEY ("setId") REFERENCES "ExchangeTriviaSet"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExchangeTriviaAnswer" ADD CONSTRAINT "ExchangeTriviaAnswer_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "ExchangeTriviaQuestion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExchangeTriviaSession" ADD CONSTRAINT "ExchangeTriviaSession_setId_fkey" FOREIGN KEY ("setId") REFERENCES "ExchangeTriviaSet"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExchangeTriviaProgress" ADD CONSTRAINT "ExchangeTriviaProgress_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "ExchangeTriviaSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExchangeTriviaProgress" ADD CONSTRAINT "ExchangeTriviaProgress_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "ExchangeTriviaQuestion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExchangeTriviaProgress" ADD CONSTRAINT "ExchangeTriviaProgress_selectedAnswerId_fkey" FOREIGN KEY ("selectedAnswerId") REFERENCES "ExchangeTriviaAnswer"("id") ON DELETE CASCADE ON UPDATE CASCADE;
