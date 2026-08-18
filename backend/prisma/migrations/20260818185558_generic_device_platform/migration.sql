-- CreateEnum
CREATE TYPE "DeviceCommandStatus" AS ENUM ('PENDING', 'SENT', 'ACKNOWLEDGED', 'FAILED', 'EXPIRED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "AutomationStatus" AS ENUM ('ACTIVE', 'PAUSED');

-- AlterTable
ALTER TABLE "device_models" ADD COLUMN     "capabilities" JSONB NOT NULL DEFAULT '{}';

-- AlterTable
ALTER TABLE "device_telemetry" ADD COLUMN     "data" JSONB NOT NULL DEFAULT '{}';

-- AlterTable
ALTER TABLE "devices" ADD COLUMN     "firmwareVersion" TEXT,
ADD COLUMN     "lastSeenAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "device_states" (
    "id" TEXT NOT NULL,
    "deviceId" TEXT NOT NULL,
    "actual" JSONB NOT NULL DEFAULT '{}',
    "desired" JSONB NOT NULL DEFAULT '{}',
    "modes" JSONB NOT NULL DEFAULT '{}',
    "lastReportedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "device_states_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "device_commands" (
    "id" TEXT NOT NULL,
    "deviceId" TEXT NOT NULL,
    "command" JSONB NOT NULL,
    "source" TEXT NOT NULL DEFAULT 'USER',
    "status" "DeviceCommandStatus" NOT NULL DEFAULT 'PENDING',
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sentAt" TIMESTAMP(3),
    "acknowledgedAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "device_commands_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "device_automations" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "deviceId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "status" "AutomationStatus" NOT NULL DEFAULT 'ACTIVE',
    "trigger" JSONB NOT NULL,
    "actions" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "device_automations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "device_states_deviceId_key" ON "device_states"("deviceId");

-- CreateIndex
CREATE INDEX "device_commands_deviceId_idx" ON "device_commands"("deviceId");

-- CreateIndex
CREATE INDEX "device_commands_status_idx" ON "device_commands"("status");

-- CreateIndex
CREATE INDEX "device_commands_createdAt_idx" ON "device_commands"("createdAt");

-- CreateIndex
CREATE INDEX "device_automations_userId_idx" ON "device_automations"("userId");

-- CreateIndex
CREATE INDEX "device_automations_deviceId_idx" ON "device_automations"("deviceId");

-- CreateIndex
CREATE INDEX "device_automations_status_idx" ON "device_automations"("status");

-- CreateIndex
CREATE INDEX "devices_lastSeenAt_idx" ON "devices"("lastSeenAt");

-- AddForeignKey
ALTER TABLE "device_states" ADD CONSTRAINT "device_states_deviceId_fkey" FOREIGN KEY ("deviceId") REFERENCES "devices"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "device_commands" ADD CONSTRAINT "device_commands_deviceId_fkey" FOREIGN KEY ("deviceId") REFERENCES "devices"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "device_automations" ADD CONSTRAINT "device_automations_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "device_automations" ADD CONSTRAINT "device_automations_deviceId_fkey" FOREIGN KEY ("deviceId") REFERENCES "devices"("id") ON DELETE CASCADE ON UPDATE CASCADE;
