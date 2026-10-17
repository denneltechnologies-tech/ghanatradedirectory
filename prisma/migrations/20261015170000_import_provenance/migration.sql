-- CreateEnum
CREATE TYPE "ImportSource" AS ENUM ('OSM', 'GOOGLE', 'PARTNER', 'CSV');

-- AlterTable
ALTER TABLE "Business" ADD COLUMN     "claimed" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "importBatchId" TEXT,
ADD COLUMN     "source" "ImportSource",
ADD COLUMN     "sourceRef" TEXT,
ADD COLUMN     "sourceUrl" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Business_source_sourceRef_key" ON "Business"("source", "sourceRef");
