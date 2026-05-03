-- Bring back nullable snapshot fields on ScheduledPost so the legacy
-- "standalone" schedule flow (compose a post directly on the calendar without
-- going through an idea) keeps working. Idea-linked posts ignore these
-- columns and read text/media from the linked ContentIdea instead.
ALTER TABLE "ScheduledPost"
  ADD COLUMN "text"      TEXT,
  ADD COLUMN "posts"     JSONB,
  ADD COLUMN "mediaType" TEXT,
  ADD COLUMN "mediaUrl"  TEXT;
