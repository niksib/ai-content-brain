-- AlterTable
ALTER TABLE "OnboardingSession" ADD COLUMN     "analysisStartedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "ThreadsAccount" ADD COLUMN     "biography" TEXT,
ADD COLUMN     "name" TEXT;
