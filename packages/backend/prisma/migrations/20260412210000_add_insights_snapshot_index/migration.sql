-- CreateIndex
CREATE INDEX "ThreadsInsightsSnapshot_contentIdeaId_fetchedAt_idx" ON "ThreadsInsightsSnapshot"("contentIdeaId", "fetchedAt" DESC);
