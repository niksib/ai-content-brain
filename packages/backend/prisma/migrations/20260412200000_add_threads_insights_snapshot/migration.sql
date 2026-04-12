-- CreateTable
CREATE TABLE "ThreadsInsightsSnapshot" (
    "id" TEXT NOT NULL,
    "contentIdeaId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "views" INTEGER,
    "likes" INTEGER,
    "replies" INTEGER,
    "reposts" INTEGER,
    "quotes" INTEGER,
    "shares" INTEGER,
    "fetchedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ThreadsInsightsSnapshot_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "ThreadsInsightsSnapshot" ADD CONSTRAINT "ThreadsInsightsSnapshot_contentIdeaId_fkey" FOREIGN KEY ("contentIdeaId") REFERENCES "ContentIdea"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
