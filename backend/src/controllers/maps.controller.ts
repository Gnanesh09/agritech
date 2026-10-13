import type { Response } from "express";
import type { AuthRequest } from "../middleware/auth.middleware";
import { prisma } from "../lib/prisma";

import {
  getDrivingRoute,
  haversineDistanceKm,
  validateCoordinates,
} from "../services/maps.service";

import { serializeListing } from "../services/marketplace.service";

// ============================================================
// TYPES / HELPERS
// ============================================================

function readCoords(value: unknown) {
  if (!value || typeof value !== "object") {
    throw new Error("Coordinates are required");
  }

  const data = value as Record<string, unknown>;

  const latitude = Number(data.latitude);
  const longitude = Number(data.longitude);

  validateCoordinates(latitude, longitude);

  return {
    latitude,
    longitude,
  };
}

// ============================================================
// GET NEARBY MARKETPLACE LISTINGS
// GET /api/user/marketplace/map/listings
//
// Query:
// ?latitude=12.9716
// &longitude=77.5946
// &radiusKm=5
// &q=spinach
//
// Uses PostgreSQL for radius filtering.
// Mapbox is NOT called for every listing.
// ============================================================

export async function getNearbyMarketplaceListings(
  req: AuthRequest,
  res: Response,
) {
  try {
    if (!req.userId) {
      return res.status(401).json({
        message: "Authentication required",
      });
    }

    const latitude = Number(req.query.latitude);
    const longitude = Number(req.query.longitude);
    const radiusKm = Number(req.query.radiusKm ?? 10);

    const q = typeof req.query.q === "string" ? req.query.q.trim() : "";

    // --------------------------------------------------------
    // Validate buyer map center
    // --------------------------------------------------------

    validateCoordinates(latitude, longitude);

    if (!Number.isFinite(radiusKm) || radiusKm <= 0 || radiusKm > 100) {
      return res.status(400).json({
        message: "radiusKm must be between 0 and 100",
      });
    }

    // --------------------------------------------------------
    // Find listings within the buyer's radius
    //
    // Straight-line distance is used for discovery.
    // This avoids calling Mapbox for every product.
    // --------------------------------------------------------

    const candidates = await prisma.$queryRaw<
      Array<{
        id: string;
        distanceKm: number;
      }>
    >`
        WITH distances AS (
          SELECT
            ml.id,

            6371 * ACOS(
              GREATEST(
                -1.0,
                LEAST(
                  1.0,

                  SIN(RADIANS(${latitude}))
                  *
                  SIN(
                    RADIANS(
                      CAST(
                        sl.latitude AS DOUBLE PRECISION
                      )
                    )
                  )

                  +

                  COS(RADIANS(${latitude}))
                  *
                  COS(
                    RADIANS(
                      CAST(
                        sl.latitude AS DOUBLE PRECISION
                      )
                    )
                  )
                  *
                  COS(
                    RADIANS(
                      CAST(
                        sl.longitude AS DOUBLE PRECISION
                      )
                    )
                    -
                    RADIANS(${longitude})
                  )
                )
              )
            ) AS "distanceKm"

          FROM marketplace_listings ml

          INNER JOIN user_locations sl
            ON sl.id = ml."sellerLocationId"

          WHERE ml.status = 'ACTIVE'
            AND sl."isActive" = true
        )

        SELECT
          id,
          "distanceKm"

        FROM distances

        WHERE "distanceKm" <= ${radiusKm}
      `;

    // --------------------------------------------------------
    // Keep only valid candidates
    // --------------------------------------------------------

    const withinRadius = candidates.filter(
      (item) =>
        Number.isFinite(Number(item.distanceKm)) &&
        Number(item.distanceKm) <= radiusKm,
    );

    const distanceMap = new Map(
      withinRadius.map((item) => [item.id, Number(item.distanceKm)]),
    );

    const listingIds = withinRadius.map((item) => item.id);

    // --------------------------------------------------------
    // Nothing nearby
    // --------------------------------------------------------

    if (listingIds.length === 0) {
      return res.status(200).json({
        center: {
          latitude,
          longitude,
        },

        radiusKm,

        listings: [],
      });
    }

    // --------------------------------------------------------
    // Fetch actual marketplace listings
    // --------------------------------------------------------

    const listings = await prisma.marketplaceListing.findMany({
      where: {
        id: {
          in: listingIds,
        },

        status: "ACTIVE",

        ...(q
          ? {
              OR: [
                {
                  cropName: {
                    contains: q,
                    mode: "insensitive",
                  },
                },
                {
                  description: {
                    contains: q,
                    mode: "insensitive",
                  },
                },
              ],
            }
          : {}),
      },

      include: {
        seller: {
          select: {
            id: true,
            username: true,
          },
        },

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

    // --------------------------------------------------------
    // Nearest seller first
    // --------------------------------------------------------

    listings.sort(
      (a, b) =>
        Number(distanceMap.get(a.id) ?? Infinity) -
        Number(distanceMap.get(b.id) ?? Infinity),
    );

    // --------------------------------------------------------
    // Response
    // --------------------------------------------------------

    return res.status(200).json({
      center: {
        latitude,
        longitude,
      },

      radiusKm,

      listings: listings.map((listing) =>
        serializeListing(listing, distanceMap.get(listing.id)),
      ),
    });
  } catch (error) {
    console.error("getNearbyMarketplaceListings:", error);

    return res.status(500).json({
      message: "Failed to fetch nearby marketplace listings",
    });
  }
}

// ============================================================
// CALCULATE DISTANCE
// POST /api/user/marketplace/map/distance
//
// Body:
// {
//   "origin": {
//     "latitude": 12.9716,
//     "longitude": 77.5946
//   },
//   "destination": {
//     "latitude": 12.9352,
//     "longitude": 77.6245
//   },
//   "route": true,
//   "traffic": true
// }
//
// route=false:
// only Haversine distance.
//
// route=true:
// Mapbox road route.
//
// traffic=true:
// Mapbox traffic-aware route.
// ============================================================

export async function calculateMarketplaceDistance(
  req: AuthRequest,
  res: Response,
) {
  try {
    if (!req.userId) {
      return res.status(401).json({
        message: "Authentication required",
      });
    }

    const origin = readCoords(req.body?.origin);

    const destination = readCoords(req.body?.destination);

    // --------------------------------------------------------
    // Straight-line distance
    // --------------------------------------------------------

    const straightLineKm = haversineDistanceKm(origin, destination);

    // --------------------------------------------------------
    // Caller only wants straight-line distance
    // --------------------------------------------------------

    if (req.body?.route === false) {
      return res.status(200).json({
        straightLineDistanceKm: Number(straightLineKm.toFixed(3)),

        route: null,
      });
    }

    // --------------------------------------------------------
    // Request road route from Mapbox
    // --------------------------------------------------------

    let route: Awaited<ReturnType<typeof getDrivingRoute>> | null = null;

    try {
      route = await getDrivingRoute(origin, destination, {
        traffic: req.body?.traffic === true,
      });
    } catch (routeError) {
      console.error("Mapbox distance route error:", routeError);

      // Do not fail the whole request.
      // Straight-line distance is still useful.
      route = null;
    }

    // --------------------------------------------------------
    // Response
    // --------------------------------------------------------

    return res.status(200).json({
      straightLineDistanceKm: Number(straightLineKm.toFixed(3)),

      route: route
        ? {
            distanceKm: Number((route.distanceMeters / 1000).toFixed(3)),

            durationMinutes: Math.max(1, Math.ceil(route.durationSeconds / 60)),

            geometry: route.geometry ?? null,

            waypoints: route.waypoints ?? null,
          }
        : null,
    });
  } catch (error) {
    console.error("calculateMarketplaceDistance:", error);

    return res.status(400).json({
      message:
        error instanceof Error ? error.message : "Failed to calculate distance",
    });
  }
}

// ============================================================
// CALCULATE DRIVING ROUTE
// POST /api/user/marketplace/map/route
//
// Body:
// {
//   "origin": {
//     "latitude": 12.9716,
//     "longitude": 77.5946
//   },
//   "destination": {
//     "latitude": 12.9352,
//     "longitude": 77.6245
//   },
//   "traffic": true
// }
//
// Uses Mapbox.
// ============================================================

export async function calculateMarketplaceRoute(
  req: AuthRequest,
  res: Response,
) {
  try {
    if (!req.userId) {
      return res.status(401).json({
        message: "Authentication required",
      });
    }

    const origin = readCoords(req.body?.origin);

    const destination = readCoords(req.body?.destination);

    // --------------------------------------------------------
    // Mapbox route
    // --------------------------------------------------------

    const route = await getDrivingRoute(origin, destination, {
      traffic: req.body?.traffic === true,
    });

    // --------------------------------------------------------
    // Response
    // --------------------------------------------------------

    return res.status(200).json({
      origin,
      destination,

      route: {
        distanceKm: Number((route.distanceMeters / 1000).toFixed(3)),

        durationMinutes: Math.max(1, Math.ceil(route.durationSeconds / 60)),

        distanceMeters: route.distanceMeters,

        durationSeconds: route.durationSeconds,

        geometry: route.geometry ?? null,

        waypoints: route.waypoints ?? null,
      },
    });
  } catch (error) {
    console.error("calculateMarketplaceRoute:", error);

    return res.status(400).json({
      message:
        error instanceof Error ? error.message : "Failed to calculate route",
    });
  }
}
