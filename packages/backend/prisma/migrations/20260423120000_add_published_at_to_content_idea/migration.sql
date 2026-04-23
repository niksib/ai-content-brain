-- AlterTable
ALTER TABLE "ContentIdea" ADD COLUMN "publishedAt" TIMESTAMP(3);

-- Backfill: for already-posted ideas, use updatedAt as best-effort publish time.
UPDATE "ContentIdea"
SET "publishedAt" = "updatedAt"
WHERE "publishStatus" = 'posted' AND "publishedAt" IS NULL;
