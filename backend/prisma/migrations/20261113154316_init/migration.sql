-- CreateEnum
CREATE TYPE "DeviceKind" AS ENUM ('GENERIC', 'RACK');

-- CreateEnum
CREATE TYPE "RackStatus" AS ENUM ('ACTIVE', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "TrayCropStatus" AS ENUM ('GROWING', 'READY', 'HARVESTED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "CommunityMemberRole" AS ENUM ('OWNER', 'MEMBER');

-- CreateEnum
CREATE TYPE "CommunityListingStatus" AS ENUM ('ACTIVE', 'PAUSED', 'SOLD_OUT', 'REMOVED');

-- CreateEnum
CREATE TYPE "HarvestAvailability" AS ENUM ('TODAY', 'TOMORROW');

-- CreateEnum
CREATE TYPE "PackUnit" AS ENUM ('G', 'KG', 'PCS', 'BUNCH', 'BOX', 'PACK');

-- CreateEnum
CREATE TYPE "CommunityOrderStatus" AS ENUM ('PLACED', 'ACCEPTED', 'READY', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "MarketplaceListingStatus" AS ENUM ('DRAFT', 'ACTIVE', 'PAUSED', 'SOLD_OUT', 'EXPIRED', 'REMOVED');

-- CreateEnum
CREATE TYPE "MarketplaceHarvestType" AS ENUM ('HARVESTED', 'UPCOMING');

-- CreateEnum
CREATE TYPE "MarketplaceFulfillmentType" AS ENUM ('SELLER_DELIVERY', 'CUSTOMER_PICKUP');

-- CreateEnum
CREATE TYPE "MarketplaceOrderStatus" AS ENUM ('PENDING_PAYMENT', 'PLACED', 'ACCEPTED', 'PREPARING', 'READY_FOR_PICKUP', 'OUT_FOR_DELIVERY', 'REACHED', 'COMPLETED', 'CANCELLED', 'REJECTED');

-- CreateEnum
CREATE TYPE "MarketplacePaymentMethod" AS ENUM ('ONLINE', 'COD');

-- CreateEnum
CREATE TYPE "MarketplacePaymentStatus" AS ENUM ('PENDING', 'AUTHORIZED', 'PAID', 'FAILED', 'REFUNDED');

-- CreateEnum
CREATE TYPE "MarketplacePaymentKind" AS ENUM ('CHECKOUT', 'DOORSTEP_UPI', 'CASH');

-- AlterTable
ALTER TABLE "device_models" ADD COLUMN     "kind" "DeviceKind" NOT NULL DEFAULT 'GENERIC',
ADD COLUMN     "rackRowCount" INTEGER,
ADD COLUMN     "traysPerRow" INTEGER NOT NULL DEFAULT 4;

-- CreateTable
CREATE TABLE "reports" (
    "id" TEXT NOT NULL,
    "publisher" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "details" TEXT NOT NULL,
    "userId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "reports_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "racks" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "deviceId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "rowCount" INTEGER NOT NULL,
    "traysPerRow" INTEGER NOT NULL DEFAULT 4,
    "status" "RackStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "racks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rack_rows" (
    "id" TEXT NOT NULL,
    "rackId" TEXT NOT NULL,
    "rowNumber" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "fanTarget" TEXT NOT NULL,
    "lightTarget" TEXT NOT NULL,
    "temperatureSensorKey" TEXT,
    "humiditySensorKey" TEXT,
    "lightSensorKey" TEXT,
    "controlConfig" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "rack_rows_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rack_trays" (
    "id" TEXT NOT NULL,
    "rowId" TEXT NOT NULL,
    "slot" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "rack_trays_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tray_crop_cycles" (
    "id" TEXT NOT NULL,
    "trayId" TEXT NOT NULL,
    "cropName" TEXT NOT NULL,
    "sowingDate" TIMESTAMP(3) NOT NULL,
    "estimatedGrowthDays" INTEGER NOT NULL,
    "expectedHarvestDate" TIMESTAMP(3) NOT NULL,
    "status" "TrayCropStatus" NOT NULL DEFAULT 'GROWING',
    "harvestedAt" TIMESTAMP(3),
    "cancelledAt" TIMESTAMP(3),
    "preHarvestReminderSentAt" TIMESTAMP(3),
    "harvestDueReminderSentAt" TIMESTAMP(3),
    "overdueHarvestReminderSentAt" TIMESTAMP(3),
    "lastHarvestCheckAt" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tray_crop_cycles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "communities" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "ownerId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "communities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "community_members" (
    "id" TEXT NOT NULL,
    "communityId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" "CommunityMemberRole" NOT NULL DEFAULT 'MEMBER',
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "community_members_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "community_listings" (
    "id" TEXT NOT NULL,
    "communityId" TEXT NOT NULL,
    "sellerId" TEXT NOT NULL,
    "cropCycleId" TEXT NOT NULL,
    "packSizeValue" DECIMAL(10,3) NOT NULL,
    "packSizeUnit" "PackUnit" NOT NULL,
    "price" DECIMAL(10,2) NOT NULL,
    "quantityAvailable" INTEGER,
    "harvestAvailability" "HarvestAvailability" NOT NULL,
    "imageUrl" TEXT,
    "imageFileId" TEXT,
    "imageSizeBytes" INTEGER,
    "status" "CommunityListingStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "community_listings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "community_orders" (
    "id" TEXT NOT NULL,
    "orderNumber" TEXT NOT NULL,
    "communityId" TEXT NOT NULL,
    "listingId" TEXT NOT NULL,
    "buyerId" TEXT NOT NULL,
    "sellerId" TEXT NOT NULL,
    "cropName" TEXT NOT NULL,
    "expectedHarvestDate" TIMESTAMP(3) NOT NULL,
    "packSizeValue" DECIMAL(10,3) NOT NULL,
    "packSizeUnit" "PackUnit" NOT NULL,
    "quantity" INTEGER NOT NULL,
    "unitPrice" DECIMAL(10,2) NOT NULL,
    "totalPrice" DECIMAL(12,2) NOT NULL,
    "status" "CommunityOrderStatus" NOT NULL DEFAULT 'PLACED',
    "cancelledAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "community_orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_locations" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "landmark" TEXT,
    "mapplsPin" TEXT,
    "latitude" DECIMAL(10,7) NOT NULL,
    "longitude" DECIMAL(10,7) NOT NULL,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_locations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "marketplace_listings" (
    "id" TEXT NOT NULL,
    "sellerId" TEXT NOT NULL,
    "cropCycleId" TEXT NOT NULL,
    "cropName" TEXT NOT NULL,
    "harvestType" "MarketplaceHarvestType" NOT NULL,
    "expectedHarvestDate" TIMESTAMP(3),
    "packSizeValue" DECIMAL(10,3) NOT NULL,
    "packSizeUnit" "PackUnit" NOT NULL,
    "originalPrice" DECIMAL(10,2) NOT NULL,
    "discountPercent" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "price" DECIMAL(10,2) NOT NULL,
    "quantityAvailable" INTEGER NOT NULL,
    "minOrderQuantity" INTEGER NOT NULL DEFAULT 1,
    "maxOrderQuantity" INTEGER,
    "description" TEXT,
    "imageUrl" TEXT,
    "imageFileId" TEXT,
    "imageSizeBytes" INTEGER,
    "sellerLocationId" TEXT NOT NULL,
    "sellerDelivery" BOOLEAN NOT NULL DEFAULT false,
    "customerPickup" BOOLEAN NOT NULL DEFAULT false,
    "deliveryRadiusKm" DECIMAL(8,2),
    "deliveryFee" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "status" "MarketplaceListingStatus" NOT NULL DEFAULT 'DRAFT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "marketplace_listings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "marketplace_orders" (
    "id" TEXT NOT NULL,
    "orderNumber" TEXT NOT NULL,
    "listingId" TEXT NOT NULL,
    "buyerId" TEXT NOT NULL,
    "sellerId" TEXT NOT NULL,
    "cropName" TEXT NOT NULL,
    "expectedHarvestDate" TIMESTAMP(3),
    "packSizeValue" DECIMAL(10,3) NOT NULL,
    "packSizeUnit" "PackUnit" NOT NULL,
    "quantity" INTEGER NOT NULL,
    "originalUnitPrice" DECIMAL(10,2) NOT NULL,
    "discountPercent" DECIMAL(5,2) NOT NULL,
    "unitPrice" DECIMAL(10,2) NOT NULL,
    "subtotal" DECIMAL(12,2) NOT NULL,
    "discountAmount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "deliveryFee" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "totalAmount" DECIMAL(12,2) NOT NULL,
    "fulfillmentType" "MarketplaceFulfillmentType" NOT NULL,
    "paymentMethod" "MarketplacePaymentMethod" NOT NULL,
    "paymentStatus" "MarketplacePaymentStatus" NOT NULL DEFAULT 'PENDING',
    "buyerLocationId" TEXT NOT NULL,
    "sellerLocationId" TEXT NOT NULL,
    "buyerAddressSnapshot" TEXT NOT NULL,
    "buyerLatitude" DECIMAL(10,7) NOT NULL,
    "buyerLongitude" DECIMAL(10,7) NOT NULL,
    "sellerAddressSnapshot" TEXT NOT NULL,
    "sellerLatitude" DECIMAL(10,7) NOT NULL,
    "sellerLongitude" DECIMAL(10,7) NOT NULL,
    "straightLineDistanceKm" DECIMAL(10,3),
    "routeDistanceKm" DECIMAL(10,3),
    "estimatedDeliveryMinutes" INTEGER,
    "routeGeometry" TEXT,
    "razorpayOrderId" TEXT,
    "reservationExpiresAt" TIMESTAMP(3),
    "inventoryReleasedAt" TIMESTAMP(3),
    "status" "MarketplaceOrderStatus" NOT NULL DEFAULT 'PLACED',
    "cancelledAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "marketplace_orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "marketplace_payments" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "kind" "MarketplacePaymentKind" NOT NULL,
    "status" "MarketplacePaymentStatus" NOT NULL DEFAULT 'PENDING',
    "amount" DECIMAL(12,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "provider" TEXT NOT NULL DEFAULT 'RAZORPAY',
    "providerOrderId" TEXT,
    "providerPaymentId" TEXT,
    "providerLinkId" TEXT,
    "providerSignature" TEXT,
    "collectedAt" TIMESTAMP(3),
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "marketplace_payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "marketplace_order_tracking" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT false,
    "latitude" DECIMAL(10,7),
    "longitude" DECIMAL(10,7),
    "heading" DECIMAL(6,2),
    "speedKmh" DECIMAL(8,2),
    "distanceRemainingKm" DECIMAL(10,3),
    "etaMinutes" INTEGER,
    "routeDistanceKm" DECIMAL(10,3),
    "routeDurationMinutes" INTEGER,
    "routeGeometry" TEXT,
    "startedAt" TIMESTAMP(3),
    "reachedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "lastUpdatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "marketplace_order_tracking_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "marketplace_order_tracking_pings" (
    "id" TEXT NOT NULL,
    "trackingId" TEXT NOT NULL,
    "latitude" DECIMAL(10,7) NOT NULL,
    "longitude" DECIMAL(10,7) NOT NULL,
    "heading" DECIMAL(6,2),
    "speedKmh" DECIMAL(8,2),
    "recordedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "marketplace_order_tracking_pings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "reports_createdAt_idx" ON "reports"("createdAt");

-- CreateIndex
CREATE INDEX "reports_publisher_idx" ON "reports"("publisher");

-- CreateIndex
CREATE INDEX "racks_userId_idx" ON "racks"("userId");

-- CreateIndex
CREATE INDEX "racks_deviceId_idx" ON "racks"("deviceId");

-- CreateIndex
CREATE INDEX "racks_deviceId_status_idx" ON "racks"("deviceId", "status");

-- CreateIndex
CREATE INDEX "racks_status_idx" ON "racks"("status");

-- CreateIndex
CREATE INDEX "rack_rows_rackId_idx" ON "rack_rows"("rackId");

-- CreateIndex
CREATE UNIQUE INDEX "rack_rows_rackId_rowNumber_key" ON "rack_rows"("rackId", "rowNumber");

-- CreateIndex
CREATE INDEX "rack_trays_rowId_idx" ON "rack_trays"("rowId");

-- CreateIndex
CREATE UNIQUE INDEX "rack_trays_rowId_slot_key" ON "rack_trays"("rowId", "slot");

-- CreateIndex
CREATE INDEX "tray_crop_cycles_trayId_idx" ON "tray_crop_cycles"("trayId");

-- CreateIndex
CREATE INDEX "tray_crop_cycles_trayId_status_idx" ON "tray_crop_cycles"("trayId", "status");

-- CreateIndex
CREATE INDEX "tray_crop_cycles_status_idx" ON "tray_crop_cycles"("status");

-- CreateIndex
CREATE INDEX "tray_crop_cycles_expectedHarvestDate_idx" ON "tray_crop_cycles"("expectedHarvestDate");

-- CreateIndex
CREATE INDEX "tray_crop_cycles_status_expectedHarvestDate_idx" ON "tray_crop_cycles"("status", "expectedHarvestDate");

-- CreateIndex
CREATE INDEX "tray_crop_cycles_cropName_idx" ON "tray_crop_cycles"("cropName");

-- CreateIndex
CREATE UNIQUE INDEX "communities_slug_key" ON "communities"("slug");

-- CreateIndex
CREATE INDEX "communities_ownerId_idx" ON "communities"("ownerId");

-- CreateIndex
CREATE INDEX "communities_name_idx" ON "communities"("name");

-- CreateIndex
CREATE INDEX "community_members_communityId_idx" ON "community_members"("communityId");

-- CreateIndex
CREATE INDEX "community_members_userId_idx" ON "community_members"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "community_members_communityId_userId_key" ON "community_members"("communityId", "userId");

-- CreateIndex
CREATE INDEX "community_listings_communityId_status_createdAt_idx" ON "community_listings"("communityId", "status", "createdAt");

-- CreateIndex
CREATE INDEX "community_listings_sellerId_idx" ON "community_listings"("sellerId");

-- CreateIndex
CREATE INDEX "community_listings_cropCycleId_idx" ON "community_listings"("cropCycleId");

-- CreateIndex
CREATE INDEX "community_listings_harvestAvailability_idx" ON "community_listings"("harvestAvailability");

-- CreateIndex
CREATE UNIQUE INDEX "community_listings_communityId_cropCycleId_key" ON "community_listings"("communityId", "cropCycleId");

-- CreateIndex
CREATE UNIQUE INDEX "community_orders_orderNumber_key" ON "community_orders"("orderNumber");

-- CreateIndex
CREATE INDEX "community_orders_communityId_idx" ON "community_orders"("communityId");

-- CreateIndex
CREATE INDEX "community_orders_listingId_idx" ON "community_orders"("listingId");

-- CreateIndex
CREATE INDEX "community_orders_buyerId_idx" ON "community_orders"("buyerId");

-- CreateIndex
CREATE INDEX "community_orders_sellerId_idx" ON "community_orders"("sellerId");

-- CreateIndex
CREATE INDEX "community_orders_status_idx" ON "community_orders"("status");

-- CreateIndex
CREATE INDEX "community_orders_communityId_createdAt_idx" ON "community_orders"("communityId", "createdAt");

-- CreateIndex
CREATE INDEX "user_locations_userId_isActive_idx" ON "user_locations"("userId", "isActive");

-- CreateIndex
CREATE INDEX "user_locations_latitude_longitude_idx" ON "user_locations"("latitude", "longitude");

-- CreateIndex
CREATE INDEX "marketplace_listings_status_createdAt_idx" ON "marketplace_listings"("status", "createdAt");

-- CreateIndex
CREATE INDEX "marketplace_listings_sellerId_status_idx" ON "marketplace_listings"("sellerId", "status");

-- CreateIndex
CREATE INDEX "marketplace_listings_cropName_idx" ON "marketplace_listings"("cropName");

-- CreateIndex
CREATE INDEX "marketplace_listings_cropCycleId_idx" ON "marketplace_listings"("cropCycleId");

-- CreateIndex
CREATE INDEX "marketplace_listings_sellerLocationId_idx" ON "marketplace_listings"("sellerLocationId");

-- CreateIndex
CREATE UNIQUE INDEX "marketplace_listings_sellerId_cropCycleId_key" ON "marketplace_listings"("sellerId", "cropCycleId");

-- CreateIndex
CREATE UNIQUE INDEX "marketplace_orders_orderNumber_key" ON "marketplace_orders"("orderNumber");

-- CreateIndex
CREATE INDEX "marketplace_orders_buyerId_createdAt_idx" ON "marketplace_orders"("buyerId", "createdAt");

-- CreateIndex
CREATE INDEX "marketplace_orders_sellerId_createdAt_idx" ON "marketplace_orders"("sellerId", "createdAt");

-- CreateIndex
CREATE INDEX "marketplace_orders_listingId_idx" ON "marketplace_orders"("listingId");

-- CreateIndex
CREATE INDEX "marketplace_orders_status_idx" ON "marketplace_orders"("status");

-- CreateIndex
CREATE INDEX "marketplace_orders_paymentStatus_idx" ON "marketplace_orders"("paymentStatus");

-- CreateIndex
CREATE INDEX "marketplace_orders_reservationExpiresAt_idx" ON "marketplace_orders"("reservationExpiresAt");

-- CreateIndex
CREATE INDEX "marketplace_payments_orderId_idx" ON "marketplace_payments"("orderId");

-- CreateIndex
CREATE INDEX "marketplace_payments_userId_idx" ON "marketplace_payments"("userId");

-- CreateIndex
CREATE INDEX "marketplace_payments_status_idx" ON "marketplace_payments"("status");

-- CreateIndex
CREATE INDEX "marketplace_payments_providerPaymentId_idx" ON "marketplace_payments"("providerPaymentId");

-- CreateIndex
CREATE INDEX "marketplace_payments_providerOrderId_idx" ON "marketplace_payments"("providerOrderId");

-- CreateIndex
CREATE INDEX "marketplace_payments_providerLinkId_idx" ON "marketplace_payments"("providerLinkId");

-- CreateIndex
CREATE UNIQUE INDEX "marketplace_order_tracking_orderId_key" ON "marketplace_order_tracking"("orderId");

-- CreateIndex
CREATE INDEX "marketplace_order_tracking_lastUpdatedAt_idx" ON "marketplace_order_tracking"("lastUpdatedAt");

-- CreateIndex
CREATE INDEX "marketplace_order_tracking_pings_trackingId_recordedAt_idx" ON "marketplace_order_tracking_pings"("trackingId", "recordedAt");

-- CreateIndex
CREATE INDEX "device_models_kind_idx" ON "device_models"("kind");

-- CreateIndex
CREATE INDEX "device_telemetry_deviceId_recordedAt_idx" ON "device_telemetry"("deviceId", "recordedAt");

-- AddForeignKey
ALTER TABLE "racks" ADD CONSTRAINT "racks_deviceId_fkey" FOREIGN KEY ("deviceId") REFERENCES "devices"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "racks" ADD CONSTRAINT "racks_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rack_rows" ADD CONSTRAINT "rack_rows_rackId_fkey" FOREIGN KEY ("rackId") REFERENCES "racks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rack_trays" ADD CONSTRAINT "rack_trays_rowId_fkey" FOREIGN KEY ("rowId") REFERENCES "rack_rows"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tray_crop_cycles" ADD CONSTRAINT "tray_crop_cycles_trayId_fkey" FOREIGN KEY ("trayId") REFERENCES "rack_trays"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "communities" ADD CONSTRAINT "communities_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "community_members" ADD CONSTRAINT "community_members_communityId_fkey" FOREIGN KEY ("communityId") REFERENCES "communities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "community_members" ADD CONSTRAINT "community_members_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "community_listings" ADD CONSTRAINT "community_listings_communityId_fkey" FOREIGN KEY ("communityId") REFERENCES "communities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "community_listings" ADD CONSTRAINT "community_listings_cropCycleId_fkey" FOREIGN KEY ("cropCycleId") REFERENCES "tray_crop_cycles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "community_listings" ADD CONSTRAINT "community_listings_sellerId_fkey" FOREIGN KEY ("sellerId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "community_orders" ADD CONSTRAINT "community_orders_buyerId_fkey" FOREIGN KEY ("buyerId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "community_orders" ADD CONSTRAINT "community_orders_communityId_fkey" FOREIGN KEY ("communityId") REFERENCES "communities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "community_orders" ADD CONSTRAINT "community_orders_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "community_listings"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "community_orders" ADD CONSTRAINT "community_orders_sellerId_fkey" FOREIGN KEY ("sellerId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_locations" ADD CONSTRAINT "user_locations_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "marketplace_listings" ADD CONSTRAINT "marketplace_listings_cropCycleId_fkey" FOREIGN KEY ("cropCycleId") REFERENCES "tray_crop_cycles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "marketplace_listings" ADD CONSTRAINT "marketplace_listings_sellerId_fkey" FOREIGN KEY ("sellerId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "marketplace_listings" ADD CONSTRAINT "marketplace_listings_sellerLocationId_fkey" FOREIGN KEY ("sellerLocationId") REFERENCES "user_locations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "marketplace_orders" ADD CONSTRAINT "marketplace_orders_buyerId_fkey" FOREIGN KEY ("buyerId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "marketplace_orders" ADD CONSTRAINT "marketplace_orders_buyerLocationId_fkey" FOREIGN KEY ("buyerLocationId") REFERENCES "user_locations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "marketplace_orders" ADD CONSTRAINT "marketplace_orders_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "marketplace_listings"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "marketplace_orders" ADD CONSTRAINT "marketplace_orders_sellerId_fkey" FOREIGN KEY ("sellerId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "marketplace_orders" ADD CONSTRAINT "marketplace_orders_sellerLocationId_fkey" FOREIGN KEY ("sellerLocationId") REFERENCES "user_locations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "marketplace_payments" ADD CONSTRAINT "marketplace_payments_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "marketplace_orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "marketplace_payments" ADD CONSTRAINT "marketplace_payments_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "marketplace_order_tracking" ADD CONSTRAINT "marketplace_order_tracking_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "marketplace_orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "marketplace_order_tracking_pings" ADD CONSTRAINT "marketplace_order_tracking_pings_trackingId_fkey" FOREIGN KEY ("trackingId") REFERENCES "marketplace_order_tracking"("id") ON DELETE CASCADE ON UPDATE CASCADE;
