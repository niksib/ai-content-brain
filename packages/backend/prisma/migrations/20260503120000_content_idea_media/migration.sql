-- AlterTable: persist the post's media URL and type on ContentIdea so they
-- survive ScheduledPost deletion (e.g. when a user removes a schedule).
ALTER TABLE "ContentIdea"
  ADD COLUMN "mediaUrl"  TEXT,
  ADD COLUMN "mediaType" TEXT;
