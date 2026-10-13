import "dotenv/config";

export type Coordinates = {
  latitude: number;
  longitude: number;
};

export type MapRoute = {
  distanceMeters: number;
  durationSeconds: number;
  geometry: unknown | null;
  waypoints?: unknown;
};

function getMapboxToken() {
  const token =
    process.env.MAPBOX_ACCESS_TOKEN?.trim() ||
    process.env.MAPBOX_PUBLIC_ACCESS_TOKEN?.trim() ||
    process.env.MAPBOX_REST_API_KEY?.trim();

  if (!token) {
    throw new Error(
      "MAPBOX_ACCESS_TOKEN (or MAPBOX_PUBLIC_ACCESS_TOKEN / MAPBOX_REST_API_KEY) is not configured",
    );
  }

  return token;
}

export function validateCoordinates(latitude: number, longitude: number) {
  if (!Number.isFinite(latitude) || latitude < -90 || latitude > 90) {
    throw new Error("Invalid latitude");
  }

  if (!Number.isFinite(longitude) || longitude < -180 || longitude > 180) {
    throw new Error("Invalid longitude");
  }
}

export function haversineDistanceKm(a: Coordinates, b: Coordinates) {
  const R = 6371;
  const dLat = ((b.latitude - a.latitude) * Math.PI) / 180;
  const dLon = ((b.longitude - a.longitude) * Math.PI) / 180;

  const lat1 = (a.latitude * Math.PI) / 180;
  const lat2 = (b.latitude * Math.PI) / 180;

  const x =
    Math.sin(dLat / 2) ** 2 +
    Math.sin(dLon / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2);

  return 2 * R * Math.asin(Math.sqrt(Math.min(1, x)));
}

/**
 * Mapbox Directions API.
 * Coordinates are sent as longitude,latitude pairs.
 * `traffic=true` selects Mapbox's driving-traffic profile.
 */
export async function getDrivingRoute(
  origin: Coordinates,
  destination: Coordinates,
  options?: { traffic?: boolean },
): Promise<MapRoute> {
  validateCoordinates(origin.latitude, origin.longitude);
  validateCoordinates(destination.latitude, destination.longitude);

  const token = getMapboxToken();
  const profile = options?.traffic ? "driving-traffic" : "driving";
  const coordinates = `${origin.longitude},${origin.latitude};${destination.longitude},${destination.latitude}`;

  const url = new URL(
    `https://api.mapbox.com/directions/v5/mapbox/${profile}/${coordinates}`,
  );

  url.searchParams.set("access_token", token);
  url.searchParams.set("geometries", "geojson");
  url.searchParams.set("overview", "full");
  url.searchParams.set("steps", "false");
  url.searchParams.set("alternatives", "false");

  const response = await fetch(url, {
    method: "GET",
    headers: { Accept: "application/json" },
  });

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(
      `Mapbox routing failed (${response.status}): ${body.slice(0, 500)}`,
    );
  }

  const payload = (await response.json()) as any;
  const route = payload?.routes?.[0];

  if (!route) {
    const code = payload?.code ? ` (${payload.code})` : "";
    throw new Error(`Mapbox returned no route${code}`);
  }

  const distanceMeters = Number(route.distance);
  const durationSeconds = Number(route.duration);

  if (!Number.isFinite(distanceMeters) || distanceMeters < 0) {
    throw new Error("Mapbox returned an invalid route distance");
  }

  if (!Number.isFinite(durationSeconds) || durationSeconds < 0) {
    throw new Error("Mapbox returned an invalid route duration");
  }

  return {
    distanceMeters,
    durationSeconds,
    geometry: route.geometry ?? null,
    waypoints: payload.waypoints ?? null,
  };
}
