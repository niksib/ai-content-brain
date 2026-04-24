-- Add scheduler claim/retry fields to ScheduledPost
ALTER TABLE "ScheduledPost" ADD COLUMN "publishingAt" TIMESTAMP(3);
ALTER TABLE "ScheduledPost" ADD COLUMN "attempts" INTEGER NOT NULL DEFAULT 0;

-- Index used by the scheduler's findMany/updateMany hot path.
CREATE INDEX "ScheduledPost_status_scheduledAt_idx" ON "ScheduledPost" ("status", "scheduledAt");

-- Stripe webhook dedup table.
CREATE TABLE "StripeWebhookEvent" (
  "eventId"    TEXT        PRIMARY KEY,
  "type"       TEXT        NOT NULL,
  "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Per-user random secret for Threads-OAuth-as-login flow.
-- Existing rows stay NULL and get rekeyed on next OAuth callback.
ALTER TABLE "ThreadsAccount" ADD COLUMN "loginSecret" TEXT;

-- Single-use OAuth state nonces.
CREATE TABLE "OAuthState" (
  "nonce"     TEXT         PRIMARY KEY,
  "purpose"   TEXT         NOT NULL,
  "userId"    TEXT,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX "OAuthState_expiresAt_idx" ON "OAuthState" ("expiresAt");
