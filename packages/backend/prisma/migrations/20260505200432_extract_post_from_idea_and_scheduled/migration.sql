-- Extract a unified `Post` model out of `ContentIdea` (produced-content
-- fields + publish lifecycle) and `ScheduledPost` (job queue + standalone
-- snapshot). After this migration:
--   * ContentIdea holds only the strategist's plan (angle/description/...).
--   * Post holds text, posts, mediaItems, imageSuggestion, scheduling and
--     job-queue fields. 1 idea ↔ 0..1 post (partial unique on contentIdeaId).
--   * Standalone posts (no idea) live as Post rows with contentIdeaId=NULL.
--
-- The migration backfills Post rows from existing data:
--   1. Idea-linked rows: read content from ContentIdea, scheduling from the
--      newest ScheduledPost referencing that idea (or null when none).
--   2. Standalone rows: copy directly from ScheduledPost.
--   3. Posted-but-never-scheduled idea rows (publishedAt set, no
--      ScheduledPost): create a Post in `published` state.

-- ───────────────────────── PostStatus enum ─────────────────────────────
CREATE TYPE "PostStatus" AS ENUM ('draft', 'scheduled', 'publishing', 'published', 'failed');

-- ───────────────────────── Post table ──────────────────────────────────
CREATE TABLE "Post" (
  "id"               TEXT         NOT NULL,
  "userId"           TEXT         NOT NULL,
  "threadsAccountId" TEXT         NOT NULL,
  "contentIdeaId"    TEXT,
  "text"             TEXT,
  "posts"            JSONB,
  "mediaItems"       JSONB,
  "imageSuggestion"  JSONB,
  "status"           "PostStatus" NOT NULL DEFAULT 'draft',
  "scheduledAt"      TIMESTAMP(3),
  "publishedAt"      TIMESTAMP(3),
  "threadsPostId"    TEXT,
  "publishingAt"     TIMESTAMP(3),
  "attempts"         INTEGER      NOT NULL DEFAULT 0,
  "errorMessage"     TEXT,
  "createdAt"        TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"        TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Post_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Post_contentIdeaId_key" ON "Post"("contentIdeaId");
CREATE INDEX "Post_status_scheduledAt_idx" ON "Post"("status", "scheduledAt");

ALTER TABLE "Post"
  ADD CONSTRAINT "Post_threadsAccountId_fkey"
    FOREIGN KEY ("threadsAccountId") REFERENCES "ThreadsAccount"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "Post_contentIdeaId_fkey"
    FOREIGN KEY ("contentIdeaId") REFERENCES "ContentIdea"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- ───────────────────────── Backfill ────────────────────────────────────
-- 1. One Post per ContentIdea that has produced content OR a ScheduledPost.
--    For idea-linked, scheduling/job fields come from the newest matching
--    ScheduledPost; null when there is none.
WITH idea_with_sched AS (
  SELECT
    ci."id"           AS idea_id,
    ci."userId"       AS user_id,
    ci."body"         AS body,
    ci."mediaItems"   AS media_items,
    ci."imageSuggestion" AS image_suggestion,
    ci."publishStatus" AS publish_status,
    ci."scheduledAt"  AS idea_scheduled_at,
    ci."publishedAt"  AS published_at,
    ci."threadsPostId" AS threads_post_id,
    ci."createdAt"    AS created_at,
    ci."updatedAt"    AS updated_at,
    sp."id"           AS sp_id,
    sp."threadsAccountId" AS sp_account_id,
    sp."scheduledAt"  AS sp_scheduled_at,
    sp."publishingAt" AS sp_publishing_at,
    sp."attempts"     AS sp_attempts,
    sp."status"       AS sp_status,
    sp."threadsPostId" AS sp_threads_post_id,
    sp."errorMessage" AS sp_error
  FROM "ContentIdea" ci
  LEFT JOIN LATERAL (
    SELECT *
    FROM "ScheduledPost" s
    WHERE s."contentIdeaId" = ci."id"
    ORDER BY s."createdAt" DESC
    LIMIT 1
  ) sp ON true
  WHERE ci."body" IS NOT NULL
     OR ci."mediaItems" IS NOT NULL
     OR ci."publishStatus" IS NOT NULL
     OR ci."threadsPostId" IS NOT NULL
     OR sp."id" IS NOT NULL
)
INSERT INTO "Post" (
  "id", "userId", "threadsAccountId", "contentIdeaId",
  "text", "posts", "mediaItems", "imageSuggestion",
  "status", "scheduledAt", "publishedAt", "threadsPostId",
  "publishingAt", "attempts", "errorMessage",
  "createdAt", "updatedAt"
)
SELECT
  -- Reuse the ScheduledPost id when present so any external references stay
  -- intact; otherwise mint a new cuid-shaped id from gen_random_uuid().
  COALESCE(iws.sp_id, 'idea_' || REPLACE(gen_random_uuid()::text, '-', '')),
  iws.user_id,
  COALESCE(
    iws.sp_account_id,
    (SELECT ta."id" FROM "ThreadsAccount" ta WHERE ta."userId" = iws.user_id LIMIT 1)
  ),
  iws.idea_id,
  -- text/posts split: idea bodies use { text } | { posts: [...] }; preserve.
  CASE
    WHEN iws.body IS NULL THEN NULL
    WHEN jsonb_typeof(iws.body->'text') = 'string' THEN iws.body->>'text'
    ELSE NULL
  END,
  CASE
    WHEN iws.body IS NULL THEN NULL
    WHEN jsonb_typeof(iws.body->'posts') = 'array' THEN
      -- materialize the thread as { text, mediaItems? } entries.
      (
        SELECT jsonb_agg(jsonb_build_object('text', entry))
        FROM jsonb_array_elements_text(iws.body->'posts') AS entry
      )
    ELSE NULL
  END,
  iws.media_items,
  iws.image_suggestion,
  -- Status derivation from old fields. `published`-state signals (publishedAt,
  -- publish_status='posted', sp_status='published') take precedence over any
  -- queue state. `failed` over `publishing`/`scheduled`.
  CASE
    WHEN iws.published_at IS NOT NULL
      OR iws.sp_status = 'published'
      OR iws.publish_status = 'posted' THEN 'published'::"PostStatus"
    WHEN iws.sp_status = 'failed' THEN 'failed'::"PostStatus"
    WHEN iws.sp_status = 'publishing' THEN 'publishing'::"PostStatus"
    WHEN iws.sp_status = 'pending' OR iws.publish_status = 'scheduled' THEN 'scheduled'::"PostStatus"
    ELSE 'draft'::"PostStatus"
  END,
  COALESCE(iws.sp_scheduled_at, iws.idea_scheduled_at),
  iws.published_at,
  COALESCE(iws.sp_threads_post_id, iws.threads_post_id),
  iws.sp_publishing_at,
  COALESCE(iws.sp_attempts, 0),
  iws.sp_error,
  iws.created_at,
  iws.updated_at
FROM idea_with_sched iws
WHERE EXISTS (SELECT 1 FROM "ThreadsAccount" ta WHERE ta."userId" = iws.user_id);

-- 2. Standalone ScheduledPost rows (contentIdeaId IS NULL).
INSERT INTO "Post" (
  "id", "userId", "threadsAccountId", "contentIdeaId",
  "text", "posts", "mediaItems", "imageSuggestion",
  "status", "scheduledAt", "publishedAt", "threadsPostId",
  "publishingAt", "attempts", "errorMessage",
  "createdAt", "updatedAt"
)
SELECT
  sp."id",
  sp."userId",
  sp."threadsAccountId",
  NULL,
  sp."text",
  sp."posts",
  sp."mediaItems",
  NULL,
  CASE
    WHEN sp."status" = 'pending'    THEN 'scheduled'::"PostStatus"
    WHEN sp."status" = 'publishing' THEN 'publishing'::"PostStatus"
    WHEN sp."status" = 'published'  THEN 'published'::"PostStatus"
    WHEN sp."status" = 'failed'     THEN 'failed'::"PostStatus"
    ELSE 'draft'::"PostStatus"
  END,
  sp."scheduledAt",
  CASE WHEN sp."status" = 'published' THEN sp."updatedAt" ELSE NULL END,
  sp."threadsPostId",
  sp."publishingAt",
  sp."attempts",
  sp."errorMessage",
  sp."createdAt",
  sp."updatedAt"
FROM "ScheduledPost" sp
WHERE sp."contentIdeaId" IS NULL;

-- ───────────────────────── Drop old artifacts ──────────────────────────
DROP TABLE "ScheduledPost";
DROP TYPE "ScheduledPostStatus";

ALTER TABLE "ContentIdea"
  DROP COLUMN "publishStatus",
  DROP COLUMN "scheduledAt",
  DROP COLUMN "publishedAt",
  DROP COLUMN "threadsPostId",
  DROP COLUMN "body",
  DROP COLUMN "imageSuggestion",
  DROP COLUMN "mediaItems";
