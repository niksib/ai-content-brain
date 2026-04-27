-- AlterTable
ALTER TABLE "ContentIdea"
  ADD COLUMN "sourceQuote" TEXT NOT NULL DEFAULT '',
  ADD COLUMN "doNot"       TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
