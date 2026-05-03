-- Merge ProducedContent into ContentIdea (1:1 relation collapsed) and slim
-- ScheduledPost down to a pure job-queue row (text/posts/media now live on
-- the linked ContentIdea and are read at publish time).

-- 1. Add new columns to ContentIdea
ALTER TABLE "ContentIdea"
  ADD COLUMN "body"            JSONB,
  ADD COLUMN "imageSuggestion" JSONB;

-- 2. Backfill body/imageSuggestion from ProducedContent
UPDATE "ContentIdea" ci
SET    "body"            = pc."body",
       "imageSuggestion" = pc."imageSuggestion"
FROM   "ProducedContent" pc
WHERE  pc."contentIdeaId" = ci."id";

-- 3. Drop ProducedContent
DROP TABLE "ProducedContent";

-- 4. Slim ScheduledPost (remove duplicate content columns)
ALTER TABLE "ScheduledPost"
  DROP COLUMN "text",
  DROP COLUMN "posts",
  DROP COLUMN "mediaType",
  DROP COLUMN "mediaUrl";

-- 5. Drop the now-unused enum
DROP TYPE "ScheduledPostMediaType";
