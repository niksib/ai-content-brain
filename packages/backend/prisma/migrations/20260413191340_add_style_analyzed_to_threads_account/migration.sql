-- AlterTable
ALTER TABLE "ThreadsAccount" ADD COLUMN     "styleAnalyzed" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "styleAnalyzedAt" TIMESTAMP(3);
