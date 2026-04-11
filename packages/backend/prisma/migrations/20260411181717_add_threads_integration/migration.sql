-- CreateEnum
CREATE TYPE "ScheduledPostMediaType" AS ENUM ('TEXT', 'IMAGE', 'VIDEO');

-- CreateEnum
CREATE TYPE "ScheduledPostStatus" AS ENUM ('pending', 'publishing', 'published', 'failed');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "ContentFormat" ADD VALUE 'text_with_image';
ALTER TYPE "ContentFormat" ADD VALUE 'image_series';

-- AlterTable
ALTER TABLE "CreatorProfile" ADD COLUMN     "contentLanguage" TEXT NOT NULL DEFAULT 'Russian';

-- CreateTable
CREATE TABLE "ThreadsAccount" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "threadsUserId" TEXT NOT NULL,
    "accessToken" TEXT NOT NULL,
    "tokenExpiresAt" TIMESTAMP(3) NOT NULL,
    "scopes" TEXT NOT NULL,
    "isPrivateProfile" BOOLEAN NOT NULL DEFAULT false,
    "postsCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ThreadsAccount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ScheduledPost" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "threadsAccountId" TEXT NOT NULL,
    "contentIdeaId" TEXT,
    "text" TEXT NOT NULL,
    "mediaType" "ScheduledPostMediaType" NOT NULL DEFAULT 'TEXT',
    "mediaUrl" TEXT,
    "scheduledAt" TIMESTAMP(3) NOT NULL,
    "status" "ScheduledPostStatus" NOT NULL DEFAULT 'pending',
    "threadsPostId" TEXT,
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ScheduledPost_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ThreadsAccount_userId_key" ON "ThreadsAccount"("userId");

-- AddForeignKey
ALTER TABLE "ScheduledPost" ADD CONSTRAINT "ScheduledPost_threadsAccountId_fkey" FOREIGN KEY ("threadsAccountId") REFERENCES "ThreadsAccount"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
