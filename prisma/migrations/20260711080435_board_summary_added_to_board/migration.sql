/*
  Warnings:

  - Added the required column `actorUsername` to the `activity_logs` table without a default value. This is not possible if the table is not empty.
  - Added the required column `entityTitle` to the `activity_logs` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "activity_logs" ADD COLUMN     "actorUsername" TEXT NOT NULL,
ADD COLUMN     "entityTitle" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "boards" ADD COLUMN     "summary" TEXT,
ADD COLUMN     "summaryGeneratedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "nickname" TEXT;
