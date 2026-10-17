import crypto from "node:crypto";
import { prisma } from "../lib/prisma";
import { haversineDistanceKm } from "./maps.service";

export const PAYMENT_RESERVATION_MINUTES = Number(
  process.env.MARKETPLACE_PAYMENT_RESERVATION_MINUTES || 15,
);

export function makeMarketplaceOrderNumber() {
  return `AG-${Date.now().toString(36).toUpperCase()}-${crypto.randomBytes(4).toString("hex").toUpperCase()}`;
}

export function toNumber(value: unknown, name: string) {
  const number = Number(value);
  if (!Number.isFinite(number))
    throw new Error(`${name} must be a valid number`);
  return number;
}

export function optionalNumber(value: unknown) {
  if (value === undefined || value === null || value === "") return undefined;
  const number = Number(value);
  if (!Number.isFinite(number)) return NaN;
  return number;
}

export function roundMoney(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export function calculateFinalPrice(
  originalPrice: number,
  discountPercent: number,
) {
  if (discountPercent < 0 || discountPercent > 100) {
    throw new Error("discountPercent must be between 0 and 100");
  }

  const finalPrice = roundMoney(originalPrice * (1 - discountPercent / 100));

  if (finalPrice <= 0) {
    throw new Error("Final price must be greater than zero");
  }

  return finalPrice;
}

export function serializeDecimal(value: unknown) {
  return value === null || value === undefined ? null : String(value);
}

export function serializeListing(listing: any, distanceKm?: number | null) {
  return {
    id: listing.id,
    seller: listing.seller
      ? {
          id: listing.seller.id,
          username: listing.seller.username,
        }
      : null,
    crop: listing.cropCycle
      ? {
          id: listing.cropCycle.id,
          cropName: listing.cropCycle.cropName,
          status: listing.cropCycle.status,
          sowingDate: listing.cropCycle.sowingDate,
          expectedHarvestDate: listing.cropCycle.expectedHarvestDate,
          harvestedAt: listing.cropCycle.harvestedAt,
          notes: listing.cropCycle.notes,
        }
      : null,
    cropName: listing.cropName,
    harvestType: listing.harvestType,
    expectedHarvestDate: listing.expectedHarvestDate,
    packSizeValue: serializeDecimal(listing.packSizeValue),
    packSizeUnit: listing.packSizeUnit,
    originalPrice: serializeDecimal(listing.originalPrice),
    discountPercent: serializeDecimal(listing.discountPercent),
    price: serializeDecimal(listing.price),
    quantityAvailable: listing.quantityAvailable,
    minOrderQuantity: listing.minOrderQuantity,
    maxOrderQuantity: listing.maxOrderQuantity,
    description: listing.description,
    imageUrl: listing.imageUrl,
    imageFileId: listing.imageFileId,
    imageSizeBytes: listing.imageSizeBytes,
    delivery: {
      sellerDelivery: listing.sellerDelivery,
      customerPickup: listing.customerPickup,
      deliveryRadiusKm: serializeDecimal(listing.deliveryRadiusKm),
      deliveryFee: serializeDecimal(listing.deliveryFee),
    },
    sellerLocation: listing.sellerLocation
      ? {
          id: listing.sellerLocation.id,
          label: listing.sellerLocation.label,
          address: listing.sellerLocation.address,
          latitude: serializeDecimal(listing.sellerLocation.latitude),
          longitude: serializeDecimal(listing.sellerLocation.longitude),
          landmark: listing.sellerLocation.landmark,
          mapplsPin: listing.sellerLocation.mapplsPin,
        }
      : null,
    status: listing.status,
    distanceKm:
      distanceKm === undefined || distanceKm === null
        ? null
        : Number(distanceKm.toFixed(3)),
    createdAt: listing.createdAt,
    updatedAt: listing.updatedAt,
  };
}

export function serializeOrder(order: any) {
  return {
    id: order.id,
    orderNumber: order.orderNumber,
    listingId: order.listingId,
    buyer: order.buyer
      ? { id: order.buyer.id, username: order.buyer.username }
      : null,
    seller: order.seller
      ? { id: order.seller.id, username: order.seller.username }
      : null,
    cropName: order.cropName,
    expectedHarvestDate: order.expectedHarvestDate,
    packSizeValue: serializeDecimal(order.packSizeValue),
    packSizeUnit: order.packSizeUnit,
    quantity: order.quantity,
    originalUnitPrice: serializeDecimal(order.originalUnitPrice),
    discountPercent: serializeDecimal(order.discountPercent),
    unitPrice: serializeDecimal(order.unitPrice),
    subtotal: serializeDecimal(order.subtotal),
    discountAmount: serializeDecimal(order.discountAmount),
    deliveryFee: serializeDecimal(order.deliveryFee),
    totalAmount: serializeDecimal(order.totalAmount),
    fulfillmentType: order.fulfillmentType,
    paymentMethod: order.paymentMethod,
    paymentStatus: order.paymentStatus,
    status: order.status,
    distanceKm: serializeDecimal(order.straightLineDistanceKm),
    routeDistanceKm: serializeDecimal(order.routeDistanceKm),
    estimatedDeliveryMinutes: order.estimatedDeliveryMinutes,
    routeGeometry: order.routeGeometry,
    reservationExpiresAt: order.reservationExpiresAt,
    buyerLocation: order.buyerLocation
      ? {
          id: order.buyerLocation.id,
          label: order.buyerLocation.label,
          address: order.buyerLocation.address,
          latitude: serializeDecimal(order.buyerLocation.latitude),
          longitude: serializeDecimal(order.buyerLocation.longitude),
          landmark: order.buyerLocation.landmark,
          mapplsPin: order.buyerLocation.mapplsPin,
        }
      : null,
    sellerLocation: order.sellerLocation
      ? {
          id: order.sellerLocation.id,
          label: order.sellerLocation.label,
          address: order.sellerLocation.address,
          latitude: serializeDecimal(order.sellerLocation.latitude),
          longitude: serializeDecimal(order.sellerLocation.longitude),
          landmark: order.sellerLocation.landmark,
          mapplsPin: order.sellerLocation.mapplsPin,
        }
      : null,
    tracking: order.tracking
      ? {
          id: order.tracking.id,
          isActive: order.tracking.isActive,
          latitude: serializeDecimal(order.tracking.latitude),
          longitude: serializeDecimal(order.tracking.longitude),
          heading: serializeDecimal(order.tracking.heading),
          speedKmh: serializeDecimal(order.tracking.speedKmh),
          distanceRemainingKm: serializeDecimal(
            order.tracking.distanceRemainingKm,
          ),
          etaMinutes: order.tracking.etaMinutes,
          routeDistanceKm: serializeDecimal(order.tracking.routeDistanceKm),
          routeDurationMinutes: order.tracking.routeDurationMinutes,
          routeGeometry: order.tracking.routeGeometry,
          startedAt: order.tracking.startedAt,
          reachedAt: order.tracking.reachedAt,
          completedAt: order.tracking.completedAt,
          lastUpdatedAt: order.tracking.lastUpdatedAt,
        }
      : null,
    createdAt: order.createdAt,
    updatedAt: order.updatedAt,
  };
}

export function assertDeliveryWithinRadius(args: {
  distanceKm: number;
  radiusKm: number | null;
}) {
  if (args.radiusKm === null) {
    throw new Error("Seller delivery radius is not configured");
  }

  if (args.distanceKm > args.radiusKm) {
    throw new Error(
      `Seller delivers only within ${args.radiusKm} km; buyer is ${args.distanceKm.toFixed(2)} km away`,
    );
  }
}

export function coordinatesFromLocation(location: any) {
  return {
    latitude: Number(location.latitude),
    longitude: Number(location.longitude),
  };
}

export async function releaseInventoryForExpiredOrder(orderId: string) {
  const now = new Date();

  return prisma.$transaction(async (tx) => {
    const order = await tx.marketplaceOrder.findUnique({
      where: { id: orderId },
    });
    if (
      !order ||
      order.status !== "PENDING_PAYMENT" ||
      !order.reservationExpiresAt
    ) {
      return false;
    }

    if (order.reservationExpiresAt > now) return false;
    if (order.inventoryReleasedAt) return false;

    const claimed = await tx.marketplaceOrder.updateMany({
      where: {
        id: order.id,
        status: "PENDING_PAYMENT",
        inventoryReleasedAt: null,
      },
      data: {
        status: "CANCELLED",
        inventoryReleasedAt: now,
        cancelledAt: now,
        reservationExpiresAt: null,
      },
    });

    if (claimed.count !== 1) return false;

    const listing = await tx.marketplaceListing.findUnique({
      where: { id: order.listingId },
    });

    if (listing) {
      await tx.marketplaceListing.update({
        where: { id: listing.id },
        data: {
          quantityAvailable: { increment: order.quantity },
          ...(listing.status === "SOLD_OUT" ? { status: "ACTIVE" } : {}),
        },
      });
    }

    return true;
  });
}

export async function cleanupExpiredReservations() {
  const expired = await prisma.marketplaceOrder.findMany({
    where: {
      status: "PENDING_PAYMENT",
      reservationExpiresAt: { lt: new Date() },
      inventoryReleasedAt: null,
    },
    select: { id: true },
    take: 100,
  });

  let released = 0;
  for (const order of expired) {
    if (await releaseInventoryForExpiredOrder(order.id)) released += 1;
  }

  return released;
}

export async function checkLocationDistance(a: any, b: any) {
  return haversineDistanceKm(
    coordinatesFromLocation(a),
    coordinatesFromLocation(b),
  );
}
