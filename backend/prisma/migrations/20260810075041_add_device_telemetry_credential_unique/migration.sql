/*
  Warnings:

  - A unique constraint covering the columns `[tokenHash]` on the table `device_credentials` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "device_credentials_tokenHash_key" ON "device_credentials"("tokenHash");
