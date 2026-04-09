-- AlterTable
ALTER TABLE "ChatMessage" ADD COLUMN     "costUsd" DOUBLE PRECISION;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "isAdmin" BOOLEAN NOT NULL DEFAULT false;
