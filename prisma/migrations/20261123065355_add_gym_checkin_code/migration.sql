/*
  Warnings:

  - A unique constraint covering the columns `[checkinCode]` on the table `Gym` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "Gym" ADD COLUMN     "checkinCode" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Gym_checkinCode_key" ON "Gym"("checkinCode");
