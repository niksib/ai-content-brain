-- CreateTable
CREATE TABLE "DataDeletionRequest" (
    "id" TEXT NOT NULL,
    "confirmationCode" TEXT NOT NULL,
    "threadsUserId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "errorMessage" TEXT,
    "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "DataDeletionRequest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "DataDeletionRequest_confirmationCode_key" ON "DataDeletionRequest"("confirmationCode");

-- CreateIndex
CREATE INDEX "DataDeletionRequest_threadsUserId_idx" ON "DataDeletionRequest"("threadsUserId");
