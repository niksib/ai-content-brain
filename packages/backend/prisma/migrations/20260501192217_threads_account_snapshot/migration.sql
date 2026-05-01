-- CreateTable
CREATE TABLE "ThreadsAccountSnapshot" (
    "id" TEXT NOT NULL,
    "threadsAccountId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "capturedDate" DATE NOT NULL,
    "capturedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "followersCount" INTEGER NOT NULL,
    "likesTotal" INTEGER NOT NULL,
    "repliesTotal" INTEGER NOT NULL,
    "repostsTotal" INTEGER NOT NULL,
    "quotesTotal" INTEGER NOT NULL,
    "viewsTotal" INTEGER NOT NULL,
    "clicksTotal" INTEGER NOT NULL,
    "postsCount" INTEGER NOT NULL,
    "partial" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "ThreadsAccountSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ThreadsAccountSnapshot_threadsAccountId_capturedDate_idx" ON "ThreadsAccountSnapshot"("threadsAccountId", "capturedDate" DESC);

-- CreateIndex
CREATE INDEX "ThreadsAccountSnapshot_userId_idx" ON "ThreadsAccountSnapshot"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "ThreadsAccountSnapshot_threadsAccountId_capturedDate_key" ON "ThreadsAccountSnapshot"("threadsAccountId", "capturedDate");

-- AddForeignKey
ALTER TABLE "ThreadsAccountSnapshot" ADD CONSTRAINT "ThreadsAccountSnapshot_threadsAccountId_fkey" FOREIGN KEY ("threadsAccountId") REFERENCES "ThreadsAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;
