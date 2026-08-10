/*
  Warnings:

  - You are about to drop the column `ownerId` on the `devices` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "devices" DROP CONSTRAINT "devices_ownerId_fkey";

-- DropIndex
DROP INDEX "devices_ownerId_idx";

-- AlterTable
ALTER TABLE "devices" DROP COLUMN "ownerId";

-- CreateTable
CREATE TABLE "user_devices" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "deviceId" TEXT NOT NULL,
    "name" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_devices_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "user_devices_userId_idx" ON "user_devices"("userId");

-- CreateIndex
CREATE INDEX "user_devices_deviceId_idx" ON "user_devices"("deviceId");

-- CreateIndex
CREATE UNIQUE INDEX "user_devices_userId_deviceId_key" ON "user_devices"("userId", "deviceId");

-- AddForeignKey
ALTER TABLE "user_devices" ADD CONSTRAINT "user_devices_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_devices" ADD CONSTRAINT "user_devices_deviceId_fkey" FOREIGN KEY ("deviceId") REFERENCES "devices"("id") ON DELETE CASCADE ON UPDATE CASCADE;
