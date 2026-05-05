-- Replace the (mediaType, mediaUrl) pair with a single JSON array column
-- `mediaItems`. One item = a single image/video post; two or more items =
-- a carousel. The change spans both ContentIdea and ScheduledPost; the
-- per-thread `posts` JSON array on ScheduledPost is rewritten so each entry
-- carries `mediaItems` instead of (mediaType, mediaUrl).

-- ───────────────────────────── ContentIdea ─────────────────────────────
ALTER TABLE "ContentIdea" ADD COLUMN "mediaItems" JSONB;

UPDATE "ContentIdea"
SET "mediaItems" = jsonb_build_array(
  jsonb_build_object('mediaType', "mediaType", 'mediaUrl', "mediaUrl")
)
WHERE "mediaUrl" IS NOT NULL
  AND "mediaType" IN ('IMAGE', 'VIDEO');

ALTER TABLE "ContentIdea" DROP COLUMN "mediaUrl";
ALTER TABLE "ContentIdea" DROP COLUMN "mediaType";

-- ───────────────────────────── ScheduledPost ───────────────────────────
ALTER TABLE "ScheduledPost" ADD COLUMN "mediaItems" JSONB;

UPDATE "ScheduledPost"
SET "mediaItems" = jsonb_build_array(
  jsonb_build_object('mediaType', "mediaType", 'mediaUrl', "mediaUrl")
)
WHERE "mediaUrl" IS NOT NULL
  AND "mediaType" IN ('IMAGE', 'VIDEO');

-- Rewrite each entry inside the `posts` JSON array, dropping legacy
-- (mediaType, mediaUrl) keys and adding `mediaItems` when both are present.
UPDATE "ScheduledPost"
SET "posts" = (
  SELECT jsonb_agg(
    CASE
      WHEN jsonb_typeof(entry) = 'object'
        AND entry ? 'mediaUrl'
        AND entry ? 'mediaType'
        AND entry->>'mediaUrl' IS NOT NULL
        AND entry->>'mediaType' IN ('IMAGE', 'VIDEO')
      THEN jsonb_set(
        entry - 'mediaUrl' - 'mediaType',
        '{mediaItems}',
        jsonb_build_array(
          jsonb_build_object('mediaType', entry->'mediaType', 'mediaUrl', entry->'mediaUrl')
        )
      )
      WHEN jsonb_typeof(entry) = 'object'
      THEN entry - 'mediaUrl' - 'mediaType'
      ELSE entry
    END
  )
  FROM jsonb_array_elements("posts") AS entry
)
WHERE "posts" IS NOT NULL AND jsonb_typeof("posts") = 'array';

ALTER TABLE "ScheduledPost" DROP COLUMN "mediaUrl";
ALTER TABLE "ScheduledPost" DROP COLUMN "mediaType";
