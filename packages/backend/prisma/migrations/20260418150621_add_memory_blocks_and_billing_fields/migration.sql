-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "CreditTransactionType" ADD VALUE 'trial_grant';
ALTER TYPE "CreditTransactionType" ADD VALUE 'agent_call';

-- AlterTable
ALTER TABLE "CreditTransaction" ADD COLUMN     "cacheWriteTokens" INTEGER,
ADD COLUMN     "costCents" INTEGER,
ADD COLUMN     "inputCachedTokens" INTEGER,
ADD COLUMN     "inputUncachedTokens" INTEGER,
ADD COLUMN     "model" TEXT,
ADD COLUMN     "outputTokens" INTEGER;

-- CreateTable
CREATE TABLE "MemoryBlock" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MemoryBlock_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OnboardingSession" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "currentStep" TEXT NOT NULL,
    "threadsAnalysis" JSONB,
    "generatedQuestions" JSONB,
    "answers" JSONB,
    "summary" TEXT,
    "clarification" TEXT,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "lastActiveAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OnboardingSession_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "MemoryBlock_userId_idx" ON "MemoryBlock"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "MemoryBlock_userId_key_key" ON "MemoryBlock"("userId", "key");

-- CreateIndex
CREATE UNIQUE INDEX "OnboardingSession_userId_key" ON "OnboardingSession"("userId");

-- AddForeignKey
ALTER TABLE "MemoryBlock" ADD CONSTRAINT "MemoryBlock_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OnboardingSession" ADD CONSTRAINT "OnboardingSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
