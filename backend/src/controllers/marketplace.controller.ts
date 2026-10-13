import type { Response } from "express";
import type { Prisma } from "../../generated/prisma/client";
import type { AuthRequest } from "../middleware/auth.middleware";
import { prisma } from "../lib/prisma";
import {
  calculateFinalPrice,
  cleanupExpiredReservations,
  coordinatesFromLocation,
  makeMarketplaceOrderNumber,
  PAYMENT_RESERVATION_MINUTES,
  roundMoney,
  serializeDecimal,
  serializeListing,
  serializeOrder,
} from "../services/marketplace.service";
import {
  getDrivingRoute,
  haversineDistanceKm,
  validateCoordinates,
} from "../services/maps.service";
import {
  createRazorpayUpiPaymentLink,
  amountToPaise,
  refundRazorpayPayment,
} from "../services/razorpay.service";
import { broadcastMarketplaceOrderEvent } from "../websocket/marketplace.socket";

const PACK_UNITS = ["G", "KG", "PCS", "BUNCH", "BOX", "PACK"] as const;
const HARVEST_TYPES = ["HARVESTED", "UPCOMING"] as const;
const FULFILLMENT_TYPES = ["SELLER_DELIVERY", "CUSTOMER_PICKUP"] as const;
const PAYMENT_METHODS = ["ONLINE", "COD"] as const;

function getRouteParam(value: unknown, name: string): string {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`Invalid ${name}`);
  }
  return value.trim();
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function parsePositiveNumber(
  value: unknown,
  field: string,
  max = Number.MAX_SAFE_INTEGER,
) {
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0 || n > max) {
    throw new Error(`${field} must be greater than zero`);
  }
  return n;
}

function parseNonNegativeNumber(
  value: unknown,
  field: string,
  max = Number.MAX_SAFE_INTEGER,
) {
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0 || n > max) {
    throw new Error(`${field} must be zero or greater`);
  }
  return n;
}

function parsePositiveInt(value: unknown, field: string, max = 1_000_000) {
  const n = Number(value);
  if (!Number.isInteger(n) || n <= 0 || n > max) {
    throw new Error(`${field} must be a positive integer`);
  }
  return n;
}

function optionalString(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function optionalInt(value: unknown, field: string, max = 1_000_000) {
  if (value === undefined || value === null || value === "") return null;
  return parsePositiveInt(value, field, max);
}

function validateImages(body: any) {
  if (
    body.imageUrl !== undefined &&
    body.imageUrl !== null &&
    typeof body.imageUrl !== "string"
  ) {
    throw new Error("imageUrl must be a string");
  }
  if (body.imageUrl && body.imageUrl.length > 4096)
    throw new Error("imageUrl is too long");
  if (
    body.imageFileId !== undefined &&
    body.imageFileId !== null &&
    typeof body.imageFileId !== "string"
  ) {
    throw new Error("imageFileId must be a string");
  }
  if (body.imageFileId && body.imageFileId.length > 512)
    throw new Error("imageFileId is too long");

  if (body.imageSizeBytes !== undefined && body.imageSizeBytes !== null) {
    const size = Number(body.imageSizeBytes);
    if (!Number.isInteger(size) || size < 0 || size > 20_000_000) {
      throw new Error("imageSizeBytes must be between 0 and 20 MB");
    }
  }
}

async function getOwnedLocation(userId: string, locationId: string) {
  return prisma.userLocation.findFirst({
    where: {
      id: locationId,
      userId,
      isActive: true,
    },
  });
}

async function getOwnedCropCycle(userId: string, cropCycleId: string) {
  return prisma.trayCropCycle.findFirst({
    where: {
      id: cropCycleId,
      tray: {
        row: {
          rack: {
            userId,
            status: "ACTIVE",
          },
        },
      },
    },
    include: {
      tray: {
        include: {
          row: {
            include: {
              rack: true,
            },
          },
        },
      },
    },
  });
}

function serializeCrop(crop: any) {
  const listed = crop.marketplaceListings?.[0] ?? null;

  return {
    id: crop.id,
    cropName: crop.cropName,
    status: crop.status,
    sowingDate: crop.sowingDate,
    expectedHarvestDate: crop.expectedHarvestDate,
    harvestedAt: crop.harvestedAt,
    notes: crop.notes,
    rack: {
      id: crop.tray.row.rack.id,
      name: crop.tray.row.rack.name,
    },
    row: {
      id: crop.tray.row.id,
      name: crop.tray.row.name,
      rowNumber: crop.tray.row.rowNumber,
    },
    tray: {
      id: crop.tray.id,
      name: crop.tray.name,
      slot: crop.tray.slot,
    },
    selling: {
      canSellAsHarvested: crop.status === "HARVESTED",
      canSellAsUpcoming: crop.status === "GROWING" || crop.status === "READY",
      hasListing: Boolean(listed && listed.status !== "REMOVED"),
      listingId: listed?.id ?? null,
      listingStatus: listed?.status ?? null,
    },
  };
}

// ============================================================
// SELLER DATA - AUTOMATICALLY FROM WHAT THE USER GROWS
// GET /api/user/marketplace/my-crops
// ============================================================
export async function getSellableCrops(req: AuthRequest, res: Response) {
  try {
    if (!req.userId)
      return res.status(401).json({ message: "Authentication required" });

    const crops = await prisma.trayCropCycle.findMany({
      where: {
        status: { in: ["GROWING", "READY", "HARVESTED"] },
        tray: {
          row: {
            rack: {
              userId: req.userId,
              status: "ACTIVE",
            },
          },
        },
      },
      orderBy: [{ status: "asc" }, { expectedHarvestDate: "asc" }],
      include: {
        tray: {
          include: {
            row: {
              include: {
                rack: true,
              },
            },
          },
        },
        marketplaceListings: {
          orderBy: { createdAt: "desc" },
          take: 1,
          select: {
            id: true,
            status: true,
          },
        },
      },
    });

    return res.status(200).json({
      crops: crops.map(serializeCrop),
    });
  } catch (error) {
    console.error("getSellableCrops:", error);
    return res
      .status(500)
      .json({ message: "Failed to fetch your crops for selling" });
  }
}

// ============================================================
// LOCATIONS
// ============================================================
export async function getMarketplaceLocations(req: AuthRequest, res: Response) {
  try {
    if (!req.userId)
      return res.status(401).json({ message: "Authentication required" });

    const locations = await prisma.userLocation.findMany({
      where: { userId: req.userId, isActive: true },
      orderBy: [{ isDefault: "desc" }, { createdAt: "desc" }],
    });

    return res.json({
      locations: locations.map((location) => ({
        id: location.id,
        label: location.label,
        address: location.address,
        latitude: serializeDecimal(location.latitude),
        longitude: serializeDecimal(location.longitude),
        mapplsPin: location.mapplsPin,
        landmark: location.landmark,
        isDefault: location.isDefault,
      })),
    });
  } catch (error) {
    console.error("getMarketplaceLocations:", error);
    return res.status(500).json({ message: "Failed to fetch locations" });
  }
}

export async function createMarketplaceLocation(
  req: AuthRequest,
  res: Response,
) {
  try {
    if (!req.userId)
      return res.status(401).json({ message: "Authentication required" });

    const {
      label,
      address,
      latitude,
      longitude,
      mapplsPin,
      landmark,
      isDefault,
    } = req.body;

    if (!isNonEmptyString(label))
      return res.status(400).json({ message: "label is required" });
    if (!isNonEmptyString(address))
      return res.status(400).json({ message: "address is required" });

    const lat = Number(latitude);
    const lonRaw = Number(longitude);
    if (!Number.isFinite(lonRaw) || lonRaw < -180 || lonRaw > 180) {
      return res.status(400).json({ message: "Invalid longitude" });
    }
    validateCoordinates(lat, lonRaw);

    const existingCount = await prisma.userLocation.count({
      where: { userId: req.userId, isActive: true },
    });

    const makeDefault = Boolean(isDefault) || existingCount === 0;

    const location = await prisma.$transaction(async (tx) => {
      if (makeDefault) {
        await tx.userLocation.updateMany({
          where: { userId: req.userId!, isActive: true },
          data: { isDefault: false },
        });
      }

      return tx.userLocation.create({
        data: {
          userId: req.userId!,
          label: label.trim().slice(0, 50),
          address: address.trim().slice(0, 500),
          latitude: lat,
          longitude: lonRaw,
          mapplsPin: optionalString(mapplsPin)?.slice(0, 100),
          landmark: optionalString(landmark)?.slice(0, 200),
          isDefault: makeDefault,
          isActive: true,
        },
      });
    });

    return res.status(201).json({
      message: "Location saved successfully",
      location: {
        id: location.id,
        label: location.label,
        address: location.address,
        latitude: serializeDecimal(location.latitude),
        longitude: serializeDecimal(location.longitude),
        mapplsPin: location.mapplsPin,
        landmark: location.landmark,
        isDefault: location.isDefault,
      },
    });
  } catch (error) {
    console.error("createMarketplaceLocation:", error);
    return res
      .status(400)
      .json({
        message:
          error instanceof Error ? error.message : "Failed to save location",
      });
  }
}

export async function updateMarketplaceLocation(
  req: AuthRequest,
  res: Response,
) {
  try {
    if (!req.userId)
      return res.status(401).json({ message: "Authentication required" });
    const locationId = getRouteParam(req.params.locationId, "locationId");

    if (!locationId || Array.isArray(locationId))
      return res.status(400).json({ message: "Invalid location ID" });

    const existing = await getOwnedLocation(req.userId, locationId);
    if (!existing)
      return res.status(404).json({ message: "Location not found" });

    const {
      label,
      address,
      latitude,
      longitude,
      mapplsPin,
      landmark,
      isDefault,
    } = req.body;
    const data: Prisma.UserLocationUpdateInput = {};

    if (label !== undefined) {
      if (!isNonEmptyString(label))
        return res.status(400).json({ message: "label cannot be empty" });
      data.label = label.trim().slice(0, 50);
    }
    if (address !== undefined) {
      if (!isNonEmptyString(address))
        return res.status(400).json({ message: "address cannot be empty" });
      data.address = address.trim().slice(0, 500);
    }

    if (latitude !== undefined || longitude !== undefined) {
      const lat =
        latitude !== undefined ? Number(latitude) : Number(existing.latitude);
      const lon =
        longitude !== undefined
          ? Number(longitude)
          : Number(existing.longitude);
      validateCoordinates(lat, lon);
      data.latitude = lat;
      data.longitude = lon;
    }

    if (mapplsPin !== undefined)
      data.mapplsPin = optionalString(mapplsPin)?.slice(0, 100);
    if (landmark !== undefined)
      data.landmark = optionalString(landmark)?.slice(0, 200);

    const updated = await prisma.$transaction(async (tx) => {
      if (isDefault === true) {
        await tx.userLocation.updateMany({
          where: { userId: req.userId!, isActive: true },
          data: { isDefault: false },
        });
        data.isDefault = true;
      }

      return tx.userLocation.update({
        where: { id: existing.id },
        data,
      });
    });

    return res.json({
      message: "Location updated successfully",
      location: {
        id: updated.id,
        label: updated.label,
        address: updated.address,
        latitude: serializeDecimal(updated.latitude),
        longitude: serializeDecimal(updated.longitude),
        mapplsPin: updated.mapplsPin,
        landmark: updated.landmark,
        isDefault: updated.isDefault,
      },
    });
  } catch (error) {
    console.error("updateMarketplaceLocation:", error);
    return res
      .status(400)
      .json({
        message:
          error instanceof Error ? error.message : "Failed to update location",
      });
  }
}

export async function deleteMarketplaceLocation(
  req: AuthRequest,
  res: Response,
) {
  try {
    if (!req.userId)
      return res.status(401).json({ message: "Authentication required" });
    const locationId = getRouteParam(req.params.locationId, "locationId");

    const existing = await getOwnedLocation(req.userId, locationId);
    if (!existing)
      return res.status(404).json({ message: "Location not found" });

    const [listingCount, buyerOrderCount, sellerOrderCount] = await Promise.all(
      [
        prisma.marketplaceListing.count({
          where: { sellerLocationId: locationId },
        }),
        prisma.marketplaceOrder.count({
          where: { buyerLocationId: locationId },
        }),
        prisma.marketplaceOrder.count({
          where: { sellerLocationId: locationId },
        }),
      ],
    );

    if (listingCount || buyerOrderCount || sellerOrderCount) {
      return res.status(409).json({
        message:
          "This location is used by marketplace records and cannot be deleted. Set another location as default instead.",
      });
    }

    await prisma.userLocation.update({
      where: { id: locationId },
      data: { isActive: false, isDefault: false },
    });

    if (existing.isDefault) {
      const replacement = await prisma.userLocation.findFirst({
        where: { userId: req.userId, isActive: true },
        orderBy: { createdAt: "desc" },
      });

      if (replacement) {
        await prisma.userLocation.update({
          where: { id: replacement.id },
          data: { isDefault: true },
        });
      }
    }

    return res.json({ message: "Location removed successfully" });
  } catch (error) {
    console.error("deleteMarketplaceLocation:", error);
    return res.status(500).json({ message: "Failed to remove location" });
  }
}

// ============================================================
// LISTINGS
// GET /api/user/marketplace/listings
// Query: q, latitude, longitude, radiusKm, sort
// ============================================================
export async function getMarketplaceListings(req: AuthRequest, res: Response) {
  try {
    if (!req.userId)
      return res.status(401).json({ message: "Authentication required" });

    await cleanupExpiredReservations().catch((error) =>
      console.error("reservation cleanup:", error),
    );

    const q = typeof req.query.q === "string" ? req.query.q.trim() : "";
    const lat =
      req.query.latitude !== undefined ? Number(req.query.latitude) : undefined;
    const lon =
      req.query.longitude !== undefined
        ? Number(req.query.longitude)
        : undefined;
    const radius =
      req.query.radiusKm !== undefined ? Number(req.query.radiusKm) : 10;
    const sort =
      typeof req.query.sort === "string" ? req.query.sort : "DISTANCE";

    if (
      (lat !== undefined && lon === undefined) ||
      (lat === undefined && lon !== undefined)
    ) {
      return res
        .status(400)
        .json({ message: "latitude and longitude must be supplied together" });
    }

    if (lat !== undefined && lon !== undefined) validateCoordinates(lat, lon);
    if (!Number.isFinite(radius) || radius <= 0 || radius > 100) {
      return res
        .status(400)
        .json({ message: "radiusKm must be between 0 and 100" });
    }

    let distanceMap = new Map<string, number>();
    let allowedIds: string[] | null = null;

    if (lat !== undefined && lon !== undefined) {
      const rows = await prisma.$queryRaw<
        Array<{ id: string; distanceKm: number }>
      >`
        WITH distances AS (
        SELECT
          ml.id,
          6371 * ACOS(GREATEST(-1.0, LEAST(1.0,
            SIN(RADIANS(${lat})) * SIN(RADIANS(CAST(sl.latitude AS DOUBLE PRECISION)))
            +
            COS(RADIANS(${lat})) * COS(RADIANS(CAST(sl.latitude AS DOUBLE PRECISION)))
            * COS(RADIANS(CAST(sl.longitude AS DOUBLE PRECISION)) - RADIANS(${lon}))
          ))) AS "distanceKm"
        FROM marketplace_listings ml
        JOIN user_locations sl ON sl.id = ml."sellerLocationId"
        WHERE ml.status = 'ACTIVE'
          AND sl."isActive" = true
      )
      SELECT id, "distanceKm"
      FROM distances
      WHERE "distanceKm" <= ${radius}
      `;

      const within = rows.filter((row) => Number(row.distanceKm) <= radius);
      allowedIds = within.map((row) => row.id);
      distanceMap = new Map(
        within.map((row) => [row.id, Number(row.distanceKm)]),
      );

      if (allowedIds.length === 0) {
        return res.json({
          center: { latitude: lat, longitude: lon },
          radiusKm: radius,
          listings: [],
        });
      }
    }

    const listings = await prisma.marketplaceListing.findMany({
      where: {
        status: "ACTIVE",
        ...(allowedIds ? { id: { in: allowedIds } } : {}),
        ...(q
          ? {
              OR: [
                { cropName: { contains: q, mode: "insensitive" } },
                { description: { contains: q, mode: "insensitive" } },
              ],
            }
          : {}),
      },
      include: {
        seller: { select: { id: true, username: true } },
        cropCycle: {
          select: {
            id: true,
            cropName: true,
            status: true,
            sowingDate: true,
            expectedHarvestDate: true,
            harvestedAt: true,
            notes: true,
          },
        },
        sellerLocation: true,
      },
    });

    let result = listings.map((listing) =>
      serializeListing(listing, distanceMap.get(listing.id) ?? null),
    );

    if (sort === "PRICE_ASC") {
      result.sort((a, b) => Number(a.price) - Number(b.price));
    } else if (sort === "PRICE_DESC") {
      result.sort((a, b) => Number(b.price) - Number(a.price));
    } else if (sort === "NEWEST") {
      result.sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt));
    } else if (lat !== undefined) {
      result.sort(
        (a, b) =>
          Number(a.distanceKm ?? Infinity) - Number(b.distanceKm ?? Infinity),
      );
    }

    return res.json({
      center: lat !== undefined ? { latitude: lat, longitude: lon } : null,
      radiusKm: lat !== undefined ? radius : null,
      listings: result,
    });
  } catch (error) {
    console.error("getMarketplaceListings:", error);
    return res
      .status(500)
      .json({ message: "Failed to fetch marketplace listings" });
  }
}

export async function getMarketplaceListing(req: AuthRequest, res: Response) {
  try {
    if (!req.userId)
      return res.status(401).json({ message: "Authentication required" });
    const listingId = getRouteParam(req.params.listingId, "listingId");

    const listing = await prisma.marketplaceListing.findFirst({
      where: { id: listingId },
      include: {
        seller: { select: { id: true, username: true } },
        cropCycle: true,
        sellerLocation: true,
      },
    });

    if (!listing || listing.status === "REMOVED")
      return res.status(404).json({ message: "Listing not found" });

    const lat =
      req.query.latitude !== undefined ? Number(req.query.latitude) : undefined;
    const lon =
      req.query.longitude !== undefined
        ? Number(req.query.longitude)
        : undefined;

    let distanceKm: number | null = null;
    if (lat !== undefined && lon !== undefined) {
      validateCoordinates(lat, lon);
      distanceKm = haversineDistanceKm(
        { latitude: lat, longitude: lon },
        coordinatesFromLocation(listing.sellerLocation),
      );
    }

    return res.json({ listing: serializeListing(listing, distanceKm) });
  } catch (error) {
    console.error("getMarketplaceListing:", error);
    return res.status(500).json({ message: "Failed to fetch listing" });
  }
}

export async function getMyMarketplaceListings(
  req: AuthRequest,
  res: Response,
) {
  try {
    if (!req.userId)
      return res.status(401).json({ message: "Authentication required" });

    const listings = await prisma.marketplaceListing.findMany({
      where: { sellerId: req.userId },
      orderBy: { createdAt: "desc" },
      include: {
        seller: { select: { id: true, username: true } },
        cropCycle: true,
        sellerLocation: true,
        _count: { select: { orders: true } },
      },
    });

    return res.json({
      listings: listings.map((listing: any) => ({
        ...serializeListing(listing),
        orderCount: listing._count.orders,
      })),
    });
  } catch (error) {
    console.error("getMyMarketplaceListings:", error);
    return res.status(500).json({ message: "Failed to fetch your listings" });
  }
}

// ============================================================
// CREATE / REACTIVATE LISTING
// POST /api/user/marketplace/listings
// ============================================================
export async function createMarketplaceListing(
  req: AuthRequest,
  res: Response,
) {
  try {
    if (!req.userId)
      return res.status(401).json({ message: "Authentication required" });

    const body = req.body ?? {};
    const {
      cropCycleId,
      harvestType,
      packSizeValue,
      packSizeUnit,
      basePrice,
      discountPercent = 0,
    } = body;

    if (!isNonEmptyString(cropCycleId))
      return res.status(400).json({ message: "cropCycleId is required" });
    if (!HARVEST_TYPES.includes(harvestType))
      return res.status(400).json({ message: "Invalid harvestType" });
    if (!PACK_UNITS.includes(packSizeUnit))
      return res.status(400).json({ message: "Invalid packSizeUnit" });

    const cropCycle = await getOwnedCropCycle(req.userId, cropCycleId);
    if (!cropCycle)
      return res
        .status(404)
        .json({ message: "Crop not found or does not belong to you" });

    if (harvestType === "HARVESTED" && cropCycle.status !== "HARVESTED") {
      return res
        .status(400)
        .json({ message: "Only harvested crops can be listed as HARVESTED" });
    }
    if (
      harvestType === "UPCOMING" &&
      !["GROWING", "READY"].includes(cropCycle.status)
    ) {
      return res
        .status(400)
        .json({
          message: "Only growing or ready crops can be listed as UPCOMING",
        });
    }

    const base = parsePositiveNumber(basePrice, "basePrice", 10_000_000);
    const discount = parseNonNegativeNumber(
      discountPercent,
      "discountPercent",
      100,
    );
    const finalPrice = calculateFinalPrice(base, discount);

    const packValue = parsePositiveNumber(
      packSizeValue,
      "packSizeValue",
      1_000_000,
    );
    const quantity = parsePositiveInt(
      body.quantityAvailable,
      "quantityAvailable",
    );
    const minOrderQuantity =
      body.minOrderQuantity === undefined
        ? 1
        : parsePositiveInt(body.minOrderQuantity, "minOrderQuantity", quantity);
    const maxOrderQuantity = optionalInt(
      body.maxOrderQuantity,
      "maxOrderQuantity",
      quantity,
    );

    if (maxOrderQuantity !== null && maxOrderQuantity < minOrderQuantity) {
      return res
        .status(400)
        .json({
          message: "maxOrderQuantity cannot be less than minOrderQuantity",
        });
    }

    const sellerLocationId = body.sellerLocationId;
    if (!isNonEmptyString(sellerLocationId))
      return res.status(400).json({ message: "sellerLocationId is required" });

    const sellerLocation = await getOwnedLocation(req.userId, sellerLocationId);
    if (!sellerLocation)
      return res.status(404).json({ message: "Seller location not found" });

    const sellerDelivery = Boolean(body.sellerDelivery);
    const customerPickup = Boolean(body.customerPickup);

    if (!sellerDelivery && !customerPickup) {
      return res
        .status(400)
        .json({
          message:
            "Select at least one delivery option: seller delivery or customer pickup",
        });
    }

    let deliveryRadiusKm: number | null = null;
    if (sellerDelivery) {
      deliveryRadiusKm = parsePositiveNumber(
        body.deliveryRadiusKm,
        "deliveryRadiusKm",
        100,
      );
    }

    const deliveryFee =
      body.deliveryFee === undefined
        ? 0
        : parseNonNegativeNumber(body.deliveryFee, "deliveryFee", 1_000_000);

    validateImages(body);

    const existing = await prisma.marketplaceListing.findUnique({
      where: {
        sellerId_cropCycleId: {
          sellerId: req.userId,
          cropCycleId,
        },
      },
    });

    const expectedHarvestDate =
      harvestType === "UPCOMING" ? cropCycle.expectedHarvestDate : null;

    const data = {
      cropName: cropCycle.cropName.trim().slice(0, 100),
      harvestType,
      expectedHarvestDate,
      packSizeValue: packValue,
      packSizeUnit,
      originalPrice: base,
      discountPercent: discount,
      price: finalPrice,
      quantityAvailable: quantity,
      minOrderQuantity,
      maxOrderQuantity,
      description: optionalString(body.description)?.slice(0, 2000),
      imageUrl: optionalString(body.imageUrl),
      imageFileId: optionalString(body.imageFileId),
      imageSizeBytes:
        body.imageSizeBytes !== undefined && body.imageSizeBytes !== null
          ? Number(body.imageSizeBytes)
          : null,
      sellerLocationId,
      sellerDelivery,
      customerPickup,
      deliveryRadiusKm,
      deliveryFee,
      status: "ACTIVE" as const,
    };

    const listing = existing
      ? await prisma.marketplaceListing.update({
          where: { id: existing.id },
          data,
          include: {
            seller: { select: { id: true, username: true } },
            cropCycle: true,
            sellerLocation: true,
          },
        })
      : await prisma.marketplaceListing.create({
          data: {
            sellerId: req.userId,
            cropCycleId,
            ...data,
          },
          include: {
            seller: { select: { id: true, username: true } },
            cropCycle: true,
            sellerLocation: true,
          },
        });

    return res.status(existing ? 200 : 201).json({
      message: existing
        ? "Marketplace listing reactivated/updated"
        : "Marketplace listing published successfully",
      listing: serializeListing(listing),
    });
  } catch (error) {
    console.error("createMarketplaceListing:", error);
    const message =
      error instanceof Error ? error.message : "Failed to create listing";
    return res.status(400).json({ message });
  }
}

// ============================================================
// UPDATE LISTING
// PATCH /api/user/marketplace/listings/:listingId
// ============================================================
export async function updateMarketplaceListing(
  req: AuthRequest,
  res: Response,
) {
  try {
    if (!req.userId)
      return res.status(401).json({ message: "Authentication required" });
    const listingId = getRouteParam(req.params.listingId, "listingId");

    const existing = await prisma.marketplaceListing.findFirst({
      where: { id: listingId, sellerId: req.userId },
      include: { cropCycle: true },
    });

    if (!existing)
      return res
        .status(404)
        .json({ message: "Listing not found or does not belong to you" });
    if (existing.status === "REMOVED")
      return res
        .status(400)
        .json({ message: "Removed listings cannot be edited" });

    const body = req.body ?? {};
    validateImages(body);

    const data: Prisma.MarketplaceListingUpdateInput = {};

    if (body.packSizeValue !== undefined)
      data.packSizeValue = parsePositiveNumber(
        body.packSizeValue,
        "packSizeValue",
        1_000_000,
      );
    if (body.packSizeUnit !== undefined) {
      if (!PACK_UNITS.includes(body.packSizeUnit))
        return res.status(400).json({ message: "Invalid packSizeUnit" });
      data.packSizeUnit = body.packSizeUnit;
    }
    if (body.quantityAvailable !== undefined) {
      const nextQuantity = parsePositiveInt(
        body.quantityAvailable,
        "quantityAvailable",
      );
      data.quantityAvailable = nextQuantity;
      if (existing.status === "SOLD_OUT") data.status = "ACTIVE";
    }
    if (body.minOrderQuantity !== undefined)
      data.minOrderQuantity = parsePositiveInt(
        body.minOrderQuantity,
        "minOrderQuantity",
      );
    if (body.maxOrderQuantity !== undefined)
      data.maxOrderQuantity = optionalInt(
        body.maxOrderQuantity,
        "maxOrderQuantity",
      );
    if (body.description !== undefined)
      data.description = optionalString(body.description)?.slice(0, 2000);
    if (body.imageUrl !== undefined)
      data.imageUrl = optionalString(body.imageUrl);
    if (body.imageFileId !== undefined)
      data.imageFileId = optionalString(body.imageFileId);
    if (body.imageSizeBytes !== undefined)
      data.imageSizeBytes =
        body.imageSizeBytes === null ? null : Number(body.imageSizeBytes);

    const currentQuantity = Number(existing.quantityAvailable);
    const finalMin = Number(data.minOrderQuantity ?? existing.minOrderQuantity);
    const finalMax =
      data.maxOrderQuantity === undefined
        ? existing.maxOrderQuantity
        : (data.maxOrderQuantity as number | null);

    const finalQuantity = Number(data.quantityAvailable ?? currentQuantity);
    if (finalMin > finalQuantity)
      return res
        .status(400)
        .json({ message: "minOrderQuantity cannot exceed quantityAvailable" });
    if (finalMax !== null && finalMax !== undefined && finalMax < finalMin) {
      return res
        .status(400)
        .json({
          message: "maxOrderQuantity cannot be less than minOrderQuantity",
        });
    }

    if (body.basePrice !== undefined || body.discountPercent !== undefined) {
      const base =
        body.basePrice !== undefined
          ? parsePositiveNumber(body.basePrice, "basePrice", 10_000_000)
          : Number(existing.originalPrice);
      const discount =
        body.discountPercent !== undefined
          ? parseNonNegativeNumber(body.discountPercent, "discountPercent", 100)
          : Number(existing.discountPercent);
      data.originalPrice = base;
      data.discountPercent = discount;
      data.price = calculateFinalPrice(base, discount);
    }

    if (body.sellerLocationId !== undefined) {
      if (!isNonEmptyString(body.sellerLocationId))
        return res
          .status(400)
          .json({ message: "sellerLocationId cannot be empty" });
      const location = await getOwnedLocation(
        req.userId,
        body.sellerLocationId,
      );
      if (!location)
        return res.status(404).json({ message: "Seller location not found" });
      data.sellerLocation = { connect: { id: body.sellerLocationId } };
    }

    const sellerDelivery =
      body.sellerDelivery === undefined
        ? existing.sellerDelivery
        : Boolean(body.sellerDelivery);
    const customerPickup =
      body.customerPickup === undefined
        ? existing.customerPickup
        : Boolean(body.customerPickup);

    if (!sellerDelivery && !customerPickup)
      return res
        .status(400)
        .json({
          message: "At least one fulfillment option must remain enabled",
        });

    data.sellerDelivery = sellerDelivery;
    data.customerPickup = customerPickup;

    if (sellerDelivery) {
      data.deliveryRadiusKm =
        body.deliveryRadiusKm !== undefined
          ? parsePositiveNumber(body.deliveryRadiusKm, "deliveryRadiusKm", 100)
          : existing.deliveryRadiusKm;
    } else {
      data.deliveryRadiusKm = null;
    }

    if (body.deliveryFee !== undefined)
      data.deliveryFee = parseNonNegativeNumber(
        body.deliveryFee,
        "deliveryFee",
        1_000_000,
      );

    if (body.status !== undefined) {
      if (!["ACTIVE", "PAUSED"].includes(body.status))
        return res.status(400).json({ message: "Invalid listing status" });
      data.status = body.status;
    }

    const updated = await prisma.marketplaceListing.update({
      where: { id: listingId },
      data,
      include: {
        seller: { select: { id: true, username: true } },
        cropCycle: true,
        sellerLocation: true,
      },
    });

    return res.json({
      message: "Listing updated successfully",
      listing: serializeListing(updated),
    });
  } catch (error) {
    console.error("updateMarketplaceListing:", error);
    return res
      .status(400)
      .json({
        message:
          error instanceof Error ? error.message : "Failed to update listing",
      });
  }
}

export async function removeMarketplaceListing(
  req: AuthRequest,
  res: Response,
) {
  try {
    if (!req.userId)
      return res.status(401).json({ message: "Authentication required" });
    const listingId = getRouteParam(req.params.listingId, "listingId");

    const listing = await prisma.marketplaceListing.findFirst({
      where: { id: listingId, sellerId: req.userId },
    });

    if (!listing) return res.status(404).json({ message: "Listing not found" });

    await prisma.marketplaceListing.update({
      where: { id: listing.id },
      data: { status: "REMOVED" },
    });

    return res.json({ message: "Listing removed successfully" });
  } catch (error) {
    console.error("removeMarketplaceListing:", error);
    return res.status(500).json({ message: "Failed to remove listing" });
  }
}

// ============================================================
// BUY
// POST /api/user/marketplace/orders
// ============================================================
export async function createMarketplaceOrder(req: AuthRequest, res: Response) {
  try {
    if (!req.userId)
      return res.status(401).json({ message: "Authentication required" });

    await cleanupExpiredReservations().catch((error) =>
      console.error("reservation cleanup:", error),
    );

    const {
      listingId,
      quantity,
      buyerLocationId,
      fulfillmentType,
      paymentMethod,
    } = req.body ?? {};

    if (!isNonEmptyString(listingId))
      return res.status(400).json({ message: "listingId is required" });
    if (!FULFILLMENT_TYPES.includes(fulfillmentType))
      return res.status(400).json({ message: "Invalid fulfillmentType" });
    if (!PAYMENT_METHODS.includes(paymentMethod))
      return res.status(400).json({ message: "Invalid paymentMethod" });

    const requestedQuantity = parsePositiveInt(quantity, "quantity", 10_000);

    const buyerLocation = await getOwnedLocation(req.userId, buyerLocationId);
    if (!buyerLocation)
      return res.status(404).json({ message: "Buyer location not found" });

    // Read listing before the transaction. The reservation transaction below
    // uses updatedAt + quantity to prevent stale checkout data.
    const listing = await prisma.marketplaceListing.findFirst({
      where: { id: listingId },
      include: {
        cropCycle: true,
        seller: {
          select: {
            id: true,
            username: true,
            email: true,
            phoneNo: true,
            countryCode: true,
          },
        },
        sellerLocation: true,
      },
    });

    if (!listing) return res.status(404).json({ message: "Listing not found" });
    if (listing.status !== "ACTIVE")
      return res
        .status(409)
        .json({ message: "Listing is no longer available" });
    if (listing.sellerId === req.userId)
      return res
        .status(400)
        .json({ message: "You cannot buy your own listing" });
    if (listing.cropCycle.status === "CANCELLED")
      return res.status(409).json({ message: "Crop is no longer available" });

    if (requestedQuantity < listing.minOrderQuantity) {
      return res
        .status(400)
        .json({
          message: `Minimum order quantity is ${listing.minOrderQuantity}`,
        });
    }
    if (
      listing.maxOrderQuantity !== null &&
      requestedQuantity > listing.maxOrderQuantity
    ) {
      return res
        .status(400)
        .json({
          message: `Maximum order quantity is ${listing.maxOrderQuantity}`,
        });
    }
    if (listing.quantityAvailable < requestedQuantity) {
      return res.status(409).json({ message: "Not enough quantity available" });
    }

    if (fulfillmentType === "SELLER_DELIVERY" && !listing.sellerDelivery) {
      return res
        .status(400)
        .json({ message: "Seller delivery is not available for this listing" });
    }
    if (fulfillmentType === "CUSTOMER_PICKUP" && !listing.customerPickup) {
      return res
        .status(400)
        .json({ message: "Customer pickup is not available for this listing" });
    }

    const buyerCoords = coordinatesFromLocation(buyerLocation);
    const sellerCoords = coordinatesFromLocation(listing.sellerLocation);
    const straightLineDistanceKm = haversineDistanceKm(
      buyerCoords,
      sellerCoords,
    );

    if (fulfillmentType === "SELLER_DELIVERY") {
      const radiusKm =
        listing.deliveryRadiusKm === null
          ? null
          : Number(listing.deliveryRadiusKm);
      if (radiusKm === null)
        return res
          .status(400)
          .json({ message: "Seller delivery radius is not configured" });
      if (straightLineDistanceKm > radiusKm) {
        return res
          .status(400)
          .json({
            message: `Delivery is available only within ${radiusKm} km`,
          });
      }
    }

    const finalPrice = Number(listing.price);
    const originalPrice = Number(listing.originalPrice);
    const discountAmountPerPack = roundMoney(originalPrice - finalPrice);
    const subtotal = roundMoney(finalPrice * requestedQuantity);
    const discountAmount = roundMoney(
      discountAmountPerPack * requestedQuantity,
    );
    const deliveryFee =
      fulfillmentType === "SELLER_DELIVERY" ? Number(listing.deliveryFee) : 0;
    const totalAmount = roundMoney(subtotal + deliveryFee);

    // Map provider is outside the database transaction. This prevents a slow
    // third-party HTTP request from holding an inventory reservation transaction open.
    let routeDistanceKm: number | null = null;
    let estimatedDeliveryMinutes: number | null = null;
    let routeGeometry: string | null = null;

    try {
      const route = await getDrivingRoute(
        fulfillmentType === "SELLER_DELIVERY" ? sellerCoords : buyerCoords,
        fulfillmentType === "SELLER_DELIVERY" ? buyerCoords : sellerCoords,
        { traffic: process.env.MAPBOX_USE_TRAFFIC === "true" },
      );
      routeDistanceKm = roundMoney(route.distanceMeters / 1000);
      estimatedDeliveryMinutes = Math.max(
        1,
        Math.ceil(route.durationSeconds / 60),
      );
      routeGeometry = route.geometry ? JSON.stringify(route.geometry) : null;
    } catch (mapError) {
      console.error("Mapbox route unavailable during checkout:", mapError);
    }

    const isOnline = paymentMethod === "ONLINE";
    const reservationExpiresAt = isOnline
      ? new Date(Date.now() + PAYMENT_RESERVATION_MINUTES * 60 * 1000)
      : null;

    const order = await prisma.$transaction(async (tx) => {
      const reservation = await tx.marketplaceListing.updateMany({
        where: {
          id: listing.id,
          status: "ACTIVE",
          quantityAvailable: { gte: requestedQuantity },
          updatedAt: listing.updatedAt,
        },
        data: {
          quantityAvailable: { decrement: requestedQuantity },
          status:
            listing.quantityAvailable - requestedQuantity === 0
              ? "SOLD_OUT"
              : "ACTIVE",
          updatedAt: new Date(),
        },
      });

      if (reservation.count !== 1) throw new Error("LISTING_CHANGED");

      const created = await tx.marketplaceOrder.create({
        data: {
          orderNumber: makeMarketplaceOrderNumber(),
          listingId: listing.id,
          buyerId: req.userId!,
          sellerId: listing.sellerId,
          cropName: listing.cropName,
          expectedHarvestDate: listing.expectedHarvestDate,
          packSizeValue: listing.packSizeValue,
          packSizeUnit: listing.packSizeUnit,
          quantity: requestedQuantity,
          originalUnitPrice: originalPrice,
          discountPercent: listing.discountPercent,
          unitPrice: finalPrice,
          subtotal,
          discountAmount,
          deliveryFee,
          totalAmount,
          fulfillmentType,
          paymentMethod,
          paymentStatus: "PENDING",
          buyerLocationId: buyerLocation.id,
          sellerLocationId: listing.sellerLocation.id,
          buyerAddressSnapshot: buyerLocation.address,
          buyerLatitude: buyerLocation.latitude,
          buyerLongitude: buyerLocation.longitude,
          sellerAddressSnapshot: listing.sellerLocation.address,
          sellerLatitude: listing.sellerLocation.latitude,
          sellerLongitude: listing.sellerLocation.longitude,
          straightLineDistanceKm,
          routeDistanceKm,
          estimatedDeliveryMinutes,
          routeGeometry,
          reservationExpiresAt,
          status: isOnline ? "PENDING_PAYMENT" : "PLACED",
          ...(fulfillmentType === "SELLER_DELIVERY"
            ? {
                tracking: {
                  create: {
                    isActive: false,
                    latitude: listing.sellerLocation.latitude,
                    longitude: listing.sellerLocation.longitude,
                    distanceRemainingKm: straightLineDistanceKm,
                    etaMinutes: estimatedDeliveryMinutes,
                    routeDistanceKm,
                    routeDurationMinutes: estimatedDeliveryMinutes,
                    routeGeometry,
                  },
                },
              }
            : {}),
        },
        include: {
          buyer: { select: { id: true, username: true } },
          seller: { select: { id: true, username: true } },
          buyerLocation: true,
          sellerLocation: true,
          tracking: true,
        },
      });

      return created;
    });

    return res.status(201).json({
      message:
        paymentMethod === "ONLINE"
          ? "Order created. Complete payment to confirm it."
          : "Order placed successfully",
      order: serializeOrder(order),
    });
  } catch (error) {
    console.error("createMarketplaceOrder:", error);
    const code = error instanceof Error ? error.message : "";
    if (code === "LISTING_CHANGED") {
      return res
        .status(409)
        .json({
          message: "Listing changed while checking out. Please try again",
        });
    }
    return res.status(500).json({ message: "Failed to create order" });
  }
}

// ============================================================
// ORDERS
// ============================================================
export async function getBuyingOrders(req: AuthRequest, res: Response) {
  try {
    if (!req.userId)
      return res.status(401).json({ message: "Authentication required" });

    const orders = await prisma.marketplaceOrder.findMany({
      where: { buyerId: req.userId },
      orderBy: { createdAt: "desc" },
      include: {
        buyer: { select: { id: true, username: true } },
        seller: { select: { id: true, username: true } },
        buyerLocation: true,
        sellerLocation: true,
        tracking: true,
      },
    });

    return res.json({ orders: orders.map(serializeOrder) });
  } catch (error) {
    console.error("getBuyingOrders:", error);
    return res.status(500).json({ message: "Failed to fetch buying orders" });
  }
}

export async function getSellingOrders(req: AuthRequest, res: Response) {
  try {
    if (!req.userId)
      return res.status(401).json({ message: "Authentication required" });

    const orders = await prisma.marketplaceOrder.findMany({
      where: { sellerId: req.userId },
      orderBy: { createdAt: "desc" },
      include: {
        buyer: { select: { id: true, username: true } },
        seller: { select: { id: true, username: true } },
        buyerLocation: true,
        sellerLocation: true,
        tracking: true,
      },
    });

    return res.json({ orders: orders.map(serializeOrder) });
  } catch (error) {
    console.error("getSellingOrders:", error);
    return res.status(500).json({ message: "Failed to fetch selling orders" });
  }
}

export async function getMarketplaceOrder(req: AuthRequest, res: Response) {
  try {
    if (!req.userId)
      return res.status(401).json({ message: "Authentication required" });
    const orderId = getRouteParam(req.params.orderId, "orderId");

    const order = await prisma.marketplaceOrder.findFirst({
      where: {
        id: orderId,
        OR: [{ buyerId: req.userId }, { sellerId: req.userId }],
      },
      include: {
        buyer: {
          select: {
            id: true,
            username: true,
            email: true,
            phoneNo: true,
            countryCode: true,
          },
        },
        seller: {
          select: {
            id: true,
            username: true,
            email: true,
            phoneNo: true,
            countryCode: true,
          },
        },
        buyerLocation: true,
        sellerLocation: true,
        tracking: true,
        payments: {
          orderBy: { createdAt: "desc" },
        },
      },
    });

    if (!order) return res.status(404).json({ message: "Order not found" });

    return res.json({
      order: {
        ...serializeOrder(order),
        payments: order.payments.map((payment: any) => ({
          id: payment.id,
          kind: payment.kind,
          status: payment.status,
          amount: serializeDecimal(payment.amount),
          currency: payment.currency,
          provider: payment.provider,
          providerOrderId: payment.providerOrderId,
          providerPaymentId: payment.providerPaymentId,
          providerLinkId: payment.providerLinkId,
          collectedAt: payment.collectedAt,
          createdAt: payment.createdAt,
        })),
      },
    });
  } catch (error) {
    console.error("getMarketplaceOrder:", error);
    return res.status(500).json({ message: "Failed to fetch order" });
  }
}

function canTransition(status: string, next: string) {
  const transitions: Record<string, string[]> = {
    PLACED: ["ACCEPTED"],
    ACCEPTED: ["PREPARING", "READY_FOR_PICKUP"],
    PREPARING: ["READY_FOR_PICKUP"],
    READY_FOR_PICKUP: ["COMPLETED"],
    REACHED: ["COMPLETED"],
  };

  return transitions[status]?.includes(next) ?? false;
}

export async function updateMarketplaceOrderStatus(
  req: AuthRequest,
  res: Response,
) {
  try {
    if (!req.userId)
      return res.status(401).json({ message: "Authentication required" });
    const orderId = getRouteParam(req.params.orderId, "orderId");
    const { status } = req.body ?? {};

    if (!isNonEmptyString(status))
      return res.status(400).json({ message: "status is required" });

    const order = await prisma.marketplaceOrder.findUnique({
      where: { id: orderId },
    });
    if (!order) return res.status(404).json({ message: "Order not found" });

    if (order.sellerId !== req.userId)
      return res
        .status(403)
        .json({ message: "Only the seller can update fulfillment status" });
    if (!canTransition(order.status, status))
      return res
        .status(409)
        .json({
          message: `Cannot move order from ${order.status} to ${status}`,
        });

    if (status === "COMPLETED" && order.paymentStatus !== "PAID") {
      return res
        .status(400)
        .json({
          message: "Payment must be collected before completing the order",
        });
    }

    const updated = await prisma.$transaction(async (tx) => {
      const next = await tx.marketplaceOrder.update({
        where: { id: order.id },
        data: {
          status: status as any,
          ...(status === "COMPLETED" ? { completedAt: new Date() } : {}),
        },
        include: {
          buyer: { select: { id: true, username: true } },
          seller: { select: { id: true, username: true } },
          buyerLocation: true,
          sellerLocation: true,
          tracking: true,
        },
      });

      return next;
    });

    broadcastMarketplaceOrderEvent(order.id, {
      type: "order:status",
      orderId: order.id,
      status: updated.status,
      paymentStatus: updated.paymentStatus,
      updatedAt: updated.updatedAt,
    });

    return res.json({
      message: "Order status updated",
      order: serializeOrder(updated),
    });
  } catch (error) {
    console.error("updateMarketplaceOrderStatus:", error);
    return res.status(500).json({ message: "Failed to update order status" });
  }
}

// ============================================================
// START LIVE DELIVERY
// POST /api/user/orders/:orderId/tracking/start
// body: current GPS location
// ============================================================
export async function startMarketplaceDelivery(
  req: AuthRequest,
  res: Response,
) {
  try {
    if (!req.userId)
      return res.status(401).json({ message: "Authentication required" });
    const orderId = getRouteParam(req.params.orderId, "orderId");
    const { latitude, longitude, heading, speedKmh } = req.body ?? {};

    const lat = Number(latitude);
    const lon = Number(longitude);
    validateCoordinates(lat, lon);

    const order = await prisma.marketplaceOrder.findFirst({
      where: { id: orderId, sellerId: req.userId },
      include: { tracking: true },
    });

    if (!order) return res.status(404).json({ message: "Order not found" });
    if (order.fulfillmentType !== "SELLER_DELIVERY")
      return res
        .status(400)
        .json({ message: "This order uses customer pickup" });
    if (!["ACCEPTED", "PREPARING", "READY_FOR_PICKUP"].includes(order.status)) {
      return res
        .status(409)
        .json({ message: `Order cannot start delivery from ${order.status}` });
    }
    if (order.paymentMethod === "ONLINE" && order.paymentStatus !== "PAID") {
      return res
        .status(400)
        .json({ message: "Online payment must be completed before delivery" });
    }

    const route = await getDrivingRoute(
      { latitude: lat, longitude: lon },
      {
        latitude: Number(order.buyerLatitude),
        longitude: Number(order.buyerLongitude),
      },
      { traffic: process.env.MAPBOX_USE_TRAFFIC === "true" },
    ).catch((mapError) => {
      console.error("Mapbox start-delivery route error:", mapError);
      return null;
    });

    const remainingStraight = haversineDistanceKm(
      { latitude: lat, longitude: lon },
      {
        latitude: Number(order.buyerLatitude),
        longitude: Number(order.buyerLongitude),
      },
    );

    const updated = await prisma.$transaction(async (tx) => {
      const next = await tx.marketplaceOrder.update({
        where: { id: order.id },
        data: { status: "OUT_FOR_DELIVERY" },
        include: {
          buyer: { select: { id: true, username: true } },
          seller: { select: { id: true, username: true } },
          buyerLocation: true,
          sellerLocation: true,
          tracking: true,
        },
      });

      await tx.marketplaceOrderTracking.upsert({
        where: { orderId: order.id },
        create: {
          orderId: order.id,
          isActive: true,
          latitude: lat,
          longitude: lon,
          heading: heading === undefined ? null : Number(heading),
          speedKmh: speedKmh === undefined ? null : Number(speedKmh),
          distanceRemainingKm: remainingStraight,
          etaMinutes: route
            ? Math.max(1, Math.ceil(route.durationSeconds / 60))
            : null,
          routeDistanceKm: route
            ? roundMoney(route.distanceMeters / 1000)
            : null,
          routeDurationMinutes: route
            ? Math.max(1, Math.ceil(route.durationSeconds / 60))
            : null,
          routeGeometry: route?.geometry
            ? JSON.stringify(route.geometry)
            : null,
          startedAt: new Date(),
          lastUpdatedAt: new Date(),
        },
        update: {
          isActive: true,
          latitude: lat,
          longitude: lon,
          heading: heading === undefined ? null : Number(heading),
          speedKmh: speedKmh === undefined ? null : Number(speedKmh),
          distanceRemainingKm: remainingStraight,
          etaMinutes: route
            ? Math.max(1, Math.ceil(route.durationSeconds / 60))
            : null,
          ...(route
            ? {
                routeDistanceKm: roundMoney(route.distanceMeters / 1000),
                routeDurationMinutes: Math.max(
                  1,
                  Math.ceil(route.durationSeconds / 60),
                ),
                routeGeometry: route.geometry
                  ? JSON.stringify(route.geometry)
                  : null,
              }
            : {}),
          startedAt: order.tracking?.startedAt ?? new Date(),
          lastUpdatedAt: new Date(),
        },
      });

      await tx.marketplaceOrderTrackingPing.create({
        data: {
          trackingId: (
            await tx.marketplaceOrderTracking.findUniqueOrThrow({
              where: { orderId: order.id },
            })
          ).id,
          latitude: lat,
          longitude: lon,
          heading: heading === undefined ? null : Number(heading),
          speedKmh: speedKmh === undefined ? null : Number(speedKmh),
        },
      });

      const finalOrder = await tx.marketplaceOrder.findUniqueOrThrow({
        where: { id: order.id },
        include: {
          buyer: { select: { id: true, username: true } },
          seller: { select: { id: true, username: true } },
          buyerLocation: true,
          sellerLocation: true,
          tracking: true,
        },
      });

      return finalOrder;
    });

    broadcastMarketplaceOrderEvent(order.id, {
      type: "order:tracking:started",
      orderId: order.id,
      status: updated.status,
      tracking: updated.tracking
        ? {
            latitude: updated.tracking.latitude,
            longitude: updated.tracking.longitude,
            heading: updated.tracking.heading,
            speedKmh: updated.tracking.speedKmh,
            distanceRemainingKm: updated.tracking.distanceRemainingKm,
            etaMinutes: updated.tracking.etaMinutes,
            routeGeometry: updated.tracking.routeGeometry,
            isActive: updated.tracking.isActive,
          }
        : null,
    });

    return res.json({
      message: "Delivery started",
      order: serializeOrder(updated),
    });
  } catch (error) {
    console.error("startMarketplaceDelivery:", error);
    return res
      .status(400)
      .json({
        message:
          error instanceof Error ? error.message : "Failed to start delivery",
      });
  }
}

export async function markMarketplaceOrderReached(
  req: AuthRequest,
  res: Response,
) {
  try {
    if (!req.userId)
      return res.status(401).json({ message: "Authentication required" });
    const orderId = getRouteParam(req.params.orderId, "orderId");
    const { latitude, longitude } = req.body ?? {};

    const lat = Number(latitude);
    const lon = Number(longitude);
    validateCoordinates(lat, lon);

    const order = await prisma.marketplaceOrder.findFirst({
      where: { id: orderId, sellerId: req.userId },
    });
    if (!order) return res.status(404).json({ message: "Order not found" });
    if (order.status !== "OUT_FOR_DELIVERY")
      return res.status(409).json({ message: "Order is not out for delivery" });

    const remaining = haversineDistanceKm(
      { latitude: lat, longitude: lon },
      {
        latitude: Number(order.buyerLatitude),
        longitude: Number(order.buyerLongitude),
      },
    );

    if (remaining > 0.5) {
      return res
        .status(400)
        .json({
          message: `You are still approximately ${remaining.toFixed(2)} km away from the customer`,
        });
    }

    const updated = await prisma.$transaction(async (tx) => {
      const next = await tx.marketplaceOrder.update({
        where: { id: order.id },
        data: { status: "REACHED" },
      });

      await tx.marketplaceOrderTracking.update({
        where: { orderId: order.id },
        data: {
          isActive: false,
          latitude: lat,
          longitude: lon,
          distanceRemainingKm: remaining,
          reachedAt: new Date(),
          lastUpdatedAt: new Date(),
        },
      });

      return tx.marketplaceOrder.findUniqueOrThrow({
        where: { id: next.id },
        include: {
          buyer: { select: { id: true, username: true } },
          seller: { select: { id: true, username: true } },
          buyerLocation: true,
          sellerLocation: true,
          tracking: true,
        },
      });
    });

    broadcastMarketplaceOrderEvent(order.id, {
      type: "order:reached",
      orderId: order.id,
      status: updated.status,
      latitude: lat,
      longitude: lon,
      paymentStatus: updated.paymentStatus,
    });

    return res.json({
      message: "Customer reached",
      order: serializeOrder(updated),
    });
  } catch (error) {
    console.error("markMarketplaceOrderReached:", error);
    return res
      .status(400)
      .json({
        message:
          error instanceof Error ? error.message : "Failed to mark reached",
      });
  }
}

// ============================================================
// CASH COLLECTION
// POST /api/user/orders/:orderId/payment/cash
// ============================================================
export async function collectCashPayment(req: AuthRequest, res: Response) {
  try {
    if (!req.userId)
      return res.status(401).json({ message: "Authentication required" });
    const orderId = getRouteParam(req.params.orderId, "orderId");

    const order = await prisma.marketplaceOrder.findFirst({
      where: { id: orderId, sellerId: req.userId },
    });
    if (!order) return res.status(404).json({ message: "Order not found" });
    if (order.paymentMethod !== "COD")
      return res.status(400).json({ message: "This order is not COD" });
    if (order.paymentStatus === "PAID")
      return res.status(409).json({ message: "Payment is already complete" });
    if (!["REACHED", "READY_FOR_PICKUP"].includes(order.status))
      return res
        .status(409)
        .json({
          message:
            "Cash can be collected only when the buyer is being handed the order",
        });

    const amount = Number(order.totalAmount);

    const updated = await prisma.$transaction(async (tx) => {
      await tx.marketplacePayment.create({
        data: {
          orderId: order.id,
          userId: req.userId!,
          kind: "CASH",
          status: "PAID",
          amount,
          currency: "INR",
          provider: "INTERNAL",
          collectedAt: new Date(),
        },
      });

      return tx.marketplaceOrder.update({
        where: { id: order.id },
        data: {
          paymentStatus: "PAID",
          status: "COMPLETED",
          completedAt: new Date(),
        },
        include: {
          buyer: { select: { id: true, username: true } },
          seller: { select: { id: true, username: true } },
          buyerLocation: true,
          sellerLocation: true,
          tracking: true,
        },
      });
    });

    broadcastMarketplaceOrderEvent(order.id, {
      type: "order:payment",
      orderId: order.id,
      paymentMethod: "CASH",
      paymentStatus: "PAID",
      orderStatus: updated.status,
    });

    return res.json({
      message: "Cash payment recorded and order completed",
      order: serializeOrder(updated),
    });
  } catch (error) {
    console.error("collectCashPayment:", error);
    return res.status(500).json({ message: "Failed to record cash payment" });
  }
}

// ============================================================
// DOORSTEP UPI
// POST /api/user/orders/:orderId/payment/upi
// Creates a Razorpay UPI Payment Link. Frontend can render its
// short_url as a QR code and wait for the webhook to mark PAID.
// ============================================================
export async function createDoorstepUpiPayment(
  req: AuthRequest,
  res: Response,
) {
  try {
    if (!req.userId)
      return res.status(401).json({ message: "Authentication required" });
    const orderId = getRouteParam(req.params.orderId, "orderId");

    const order = await prisma.marketplaceOrder.findFirst({
      where: { id: orderId, sellerId: req.userId },
      include: {
        buyer: {
          select: {
            id: true,
            username: true,
            email: true,
            phoneNo: true,
            countryCode: true,
          },
        },
      },
    });

    if (!order) return res.status(404).json({ message: "Order not found" });
    if (order.paymentMethod !== "COD")
      return res.status(400).json({ message: "This order is not COD" });
    if (order.status !== "REACHED")
      return res
        .status(409)
        .json({
          message:
            "Doorstep UPI can be requested only after reaching the buyer",
        });
    if (order.paymentStatus === "PAID")
      return res.status(400).json({ message: "Payment is already complete" });

    const pendingPayment = await prisma.marketplacePayment.findFirst({
      where: {
        orderId: order.id,
        kind: "DOORSTEP_UPI",
        status: "PENDING",
        providerLinkId: { not: null },
      },
      orderBy: { createdAt: "desc" },
    });

    if (pendingPayment?.providerLinkId) {
      const metadata = (pendingPayment.metadata || {}) as any;
      return res.json({
        message: "Existing doorstep UPI payment is still pending",
        payment: {
          id: pendingPayment.id,
          providerLinkId: pendingPayment.providerLinkId,
          shortUrl: metadata.shortUrl ?? null,
          amount: serializeDecimal(order.totalAmount),
          currency: "INR",
        },
      });
    }

    const link = await createRazorpayUpiPaymentLink({
      amountPaise: amountToPaise(Number(order.totalAmount)),
      referenceId: `AG-${order.orderNumber}-UPI`,
      description: `Fresh marketplace order ${order.orderNumber}`,
      customer: {
        name: order.buyer.username,
        email: order.buyer.email,
        contact: `${order.buyer.countryCode}${order.buyer.phoneNo}`,
      },
    });

    const payment = await prisma.marketplacePayment.create({
      data: {
        orderId: order.id,
        userId: order.buyerId,
        kind: "DOORSTEP_UPI",
        status: "PENDING",
        amount: order.totalAmount,
        currency: "INR",
        provider: "RAZORPAY",
        providerLinkId: link.id,
        metadata: {
          shortUrl: link.short_url ?? null,
        },
      },
    });

    return res.status(201).json({
      message: "Doorstep UPI payment created",
      payment: {
        id: payment.id,
        providerLinkId: payment.providerLinkId,
        shortUrl: link.short_url ?? null,
        amount: serializeDecimal(order.totalAmount),
        currency: "INR",
      },
    });
  } catch (error) {
    console.error("createDoorstepUpiPayment:", error);
    return res
      .status(400)
      .json({
        message:
          error instanceof Error
            ? error.message
            : "Failed to create UPI payment",
      });
  }
}

// ============================================================
// CANCEL ORDER
// ============================================================
export async function cancelMarketplaceOrder(req: AuthRequest, res: Response) {
  try {
    if (!req.userId)
      return res.status(401).json({ message: "Authentication required" });
    const orderId = getRouteParam(req.params.orderId, "orderId");

    const order = await prisma.marketplaceOrder.findFirst({
      where: {
        id: orderId,
        OR: [{ buyerId: req.userId }, { sellerId: req.userId }],
      },
      include: { payments: true },
    });

    if (!order) return res.status(404).json({ message: "Order not found" });
    if (
      !["PENDING_PAYMENT", "PLACED", "ACCEPTED", "PREPARING"].includes(
        order.status,
      )
    ) {
      return res
        .status(409)
        .json({ message: `Order cannot be cancelled from ${order.status}` });
    }

    if (
      order.buyerId === req.userId &&
      !["PENDING_PAYMENT", "PLACED"].includes(order.status)
    ) {
      return res
        .status(403)
        .json({ message: "Buyer cancellation window has closed" });
    }

    // A paid online order requires a real Razorpay refund before we mark it
    // cancelled in our database.
    if (order.paymentStatus === "PAID" && order.paymentMethod === "ONLINE") {
      const payment = order.payments.find(
        (p: any) => p.provider === "RAZORPAY" && p.providerPaymentId,
      );

      if (!payment?.providerPaymentId) {
        return res
          .status(409)
          .json({
            message: "Paid order has no refundable Razorpay payment record",
          });
      }

      const refund = await refundRazorpayPayment({
        paymentId: payment.providerPaymentId,
        notes: { orderNumber: order.orderNumber },
      });

      await prisma.$transaction(async (tx) => {
        const claimed = await tx.marketplaceOrder.updateMany({
          where: {
            id: order.id,
            status: order.status,
            inventoryReleasedAt: null,
          },
          data: {
            status: "CANCELLED",
            paymentStatus: "REFUNDED",
            cancelledAt: new Date(),
            inventoryReleasedAt: new Date(),
            reservationExpiresAt: null,
          },
        });

        if (claimed.count !== 1) throw new Error("ORDER_CHANGED");

        await tx.marketplacePayment.update({
          where: { id: payment.id },
          data: { status: "REFUNDED", metadata: refund },
        });

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
      });

      return res.json({ message: "Order cancelled and refund initiated" });
    }

    await prisma.$transaction(async (tx) => {
      const claimed = await tx.marketplaceOrder.updateMany({
        where: {
          id: order.id,
          status: order.status,
          inventoryReleasedAt: null,
        },
        data: {
          status: "CANCELLED",
          cancelledAt: new Date(),
          inventoryReleasedAt: new Date(),
          reservationExpiresAt: null,
        },
      });

      if (claimed.count !== 1) throw new Error("ORDER_CHANGED");

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
    });

    return res.json({
      message: "Order cancelled and reserved quantity returned to inventory",
    });
  } catch (error) {
    console.error("cancelMarketplaceOrder:", error);
    if (error instanceof Error && error.message === "ORDER_CHANGED") {
      return res
        .status(409)
        .json({
          message: "Order changed while cancelling. Refresh and try again.",
        });
    }
    return res.status(500).json({ message: "Failed to cancel order" });
  }
}

export async function cleanupReservationsController(
  req: AuthRequest,
  res: Response,
) {
  try {
    if (!req.userId)
      return res.status(401).json({ message: "Authentication required" });
    const released = await cleanupExpiredReservations();
    return res.json({ released });
  } catch (error) {
    console.error("cleanupReservationsController:", error);
    return res.status(500).json({ message: "Failed to clean reservations" });
  }
}
