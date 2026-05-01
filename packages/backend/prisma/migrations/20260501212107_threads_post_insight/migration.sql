-- CreateTable
CREATE TABLE "ThreadsPostInsight" (
    "id" TEXT NOT NULL,
    "threadsAccountId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "threadsPostId" TEXT NOT NULL,
    "publishedAt" TIMESTAMP(3) NOT NULL,
    "preview" TEXT NOT NULL DEFAULT '',
    "views" INTEGER NOT NULL DEFAULT 0,
    "likes" INTEGER NOT NULL DEFAULT 0,
    "replies" INTEGER NOT NULL DEFAULT 0,
    "reposts" INTEGER NOT NULL DEFAULT 0,
    "quotes" INTEGER NOT NULL DEFAULT 0,
    "shares" INTEGER NOT NULL DEFAULT 0,
    "fetchedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ThreadsPostInsight_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ThreadsPostInsight_userId_publishedAt_idx" ON "ThreadsPostInsight"("userId", "publishedAt" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "ThreadsPostInsight_threadsAccountId_threadsPostId_key" ON "ThreadsPostInsight"("threadsAccountId", "threadsPostId");

-- AddForeignKey
ALTER TABLE "ThreadsPostInsight" ADD CONSTRAINT "ThreadsPostInsight_threadsAccountId_fkey" FOREIGN KEY ("threadsAccountId") REFERENCES "ThreadsAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;
