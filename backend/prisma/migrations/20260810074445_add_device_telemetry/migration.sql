-- CreateTable
CREATE TABLE "device_credentials" (
    "id" TEXT NOT NULL,
    "deviceId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "lastUsedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "device_credentials_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "device_telemetry" (
    "id" TEXT NOT NULL,
    "deviceId" TEXT NOT NULL,
    "temperature" DOUBLE PRECISION,
    "humidity" DOUBLE PRECISION,
    "recordedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "device_telemetry_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "device_credentials_deviceId_key" ON "device_credentials"("deviceId");

-- CreateIndex
CREATE INDEX "device_telemetry_deviceId_idx" ON "device_telemetry"("deviceId");

-- CreateIndex
CREATE INDEX "device_telemetry_recordedAt_idx" ON "device_telemetry"("recordedAt");

-- AddForeignKey
ALTER TABLE "device_credentials" ADD CONSTRAINT "device_credentials_deviceId_fkey" FOREIGN KEY ("deviceId") REFERENCES "devices"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "device_telemetry" ADD CONSTRAINT "device_telemetry_deviceId_fkey" FOREIGN KEY ("deviceId") REFERENCES "devices"("id") ON DELETE CASCADE ON UPDATE CASCADE;
