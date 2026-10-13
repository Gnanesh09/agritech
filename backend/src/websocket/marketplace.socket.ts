import type { Server as HttpServer } from "node:http";
import jwt from "jsonwebtoken";
import { WebSocketServer, WebSocket } from "ws";
import config from "../config/config";
import { prisma } from "../lib/prisma";
import { haversineDistanceKm, validateCoordinates } from "../services/maps.service";

interface JwtPayload {
  id: string;
  sessionId?: string;
}

type Client = {
  ws: WebSocket;
  userId: string | null;
  joinedOrders: Set<string>;
  lastLocationAt: number;
};

type IncomingMessage = {
  type?: string;
  accessToken?: string;
  orderId?: string;
  latitude?: number;
  longitude?: number;
  heading?: number;
  speedKmh?: number;
};

const clients = new Set<Client>();
const rooms = new Map<string, Set<Client>>();

function send(client: Client, payload: unknown) {
  if (client.ws.readyState !== WebSocket.OPEN) return;
  client.ws.send(JSON.stringify(payload));
}

function broadcast(orderId: string, payload: unknown) {
  const room = rooms.get(orderId);
  if (!room) return;
  for (const client of room) send(client, payload);
}

export function broadcastMarketplaceOrderEvent(orderId: string, payload: unknown) {
  broadcast(orderId, payload);
}

async function authenticate(client: Client, accessToken: unknown) {
  if (typeof accessToken !== "string" || !accessToken) throw new Error("Missing access token");

  const decoded = jwt.verify(accessToken, config.JWT_SECRET) as JwtPayload;
  if (!decoded.id) throw new Error("Invalid token");

  client.userId = decoded.id;
  send(client, { type: "auth:success", userId: decoded.id });
}

async function joinOrder(client: Client, orderId: unknown) {
  if (!client.userId) throw new Error("Authenticate first");
  if (typeof orderId !== "string" || !orderId) throw new Error("orderId is required");

  const order = await prisma.marketplaceOrder.findFirst({
    where: {
      id: orderId,
      OR: [{ buyerId: client.userId }, { sellerId: client.userId }],
    },
  });

  if (!order) throw new Error("You do not have access to this order");

  let room = rooms.get(orderId);
  if (!room) {
    room = new Set();
    rooms.set(orderId, room);
  }

  room.add(client);
  client.joinedOrders.add(orderId);

  const tracking = await prisma.marketplaceOrderTracking.findUnique({ where: { orderId } });
  send(client, {
    type: "order:joined",
    orderId,
    status: order.status,
    tracking: tracking
      ? {
          latitude: tracking.latitude,
          longitude: tracking.longitude,
          heading: tracking.heading,
          speedKmh: tracking.speedKmh,
          distanceRemainingKm: tracking.distanceRemainingKm,
          etaMinutes: tracking.etaMinutes,
          routeGeometry: tracking.routeGeometry,
          isActive: tracking.isActive,
        }
      : null,
  });
}

async function updateSellerLocation(client: Client, message: IncomingMessage) {
  if (!client.userId) throw new Error("Authenticate first");
  if (typeof message.orderId !== "string") throw new Error("orderId is required");

  const now = Date.now();
  // Server-side throttling. The app may sample GPS faster, but we persist/broadcast
  // at most once every 2 seconds per socket.
  if (now - client.lastLocationAt < 2_000) return;
  client.lastLocationAt = now;

  const latitude = Number(message.latitude);
  const longitude = Number(message.longitude);
  validateCoordinates(latitude, longitude);

  const order = await prisma.marketplaceOrder.findFirst({
    where: {
      id: message.orderId,
      sellerId: client.userId,
      status: "OUT_FOR_DELIVERY",
      fulfillmentType: "SELLER_DELIVERY",
    },
  });

  if (!order) throw new Error("Order is not assigned to you for live delivery");

  const buyer = {
    latitude: Number(order.buyerLatitude),
    longitude: Number(order.buyerLongitude),
  };

  const distanceRemainingKm = haversineDistanceKm(
    { latitude, longitude },
    buyer,
  );

  const tracking = await prisma.marketplaceOrderTracking.upsert({
    where: { orderId: order.id },
    create: {
      orderId: order.id,
      isActive: true,
      latitude,
      longitude,
      heading: message.heading === undefined ? null : Number(message.heading),
      speedKmh: message.speedKmh === undefined ? null : Number(message.speedKmh),
      distanceRemainingKm,
      lastUpdatedAt: new Date(),
    },
    update: {
      isActive: true,
      latitude,
      longitude,
      heading: message.heading === undefined ? null : Number(message.heading),
      speedKmh: message.speedKmh === undefined ? null : Number(message.speedKmh),
      distanceRemainingKm,
      lastUpdatedAt: new Date(),
    },
  });

  // Keep an audit trail. Production systems should batch/downsample these records.
  await prisma.marketplaceOrderTrackingPing.create({
    data: {
      trackingId: tracking.id,
      latitude,
      longitude,
      heading: message.heading === undefined ? null : Number(message.heading),
      speedKmh: message.speedKmh === undefined ? null : Number(message.speedKmh),
    },
  });

  broadcast(order.id, {
    type: "order:location:update",
    orderId: order.id,
    status: order.status,
    latitude,
    longitude,
    heading: tracking.heading,
    speedKmh: tracking.speedKmh,
    distanceRemainingKm: Number(distanceRemainingKm.toFixed(3)),
    etaMinutes: tracking.etaMinutes,
    lastUpdatedAt: tracking.lastUpdatedAt,
  });
}

function cleanupClient(client: Client) {
  clients.delete(client);
  for (const orderId of client.joinedOrders) {
    const room = rooms.get(orderId);
    if (!room) continue;
    room.delete(client);
    if (room.size === 0) rooms.delete(orderId);
  }
}

export function attachMarketplaceWebSocket(server: HttpServer) {
  const wss = new WebSocketServer({ noServer: true });

  server.on("upgrade", (request, socket, head) => {
    const url = new URL(request.url || "/", "http://localhost");

    if (url.pathname !== "/ws/marketplace") return;

    wss.handleUpgrade(request, socket, head, (ws) => {
      wss.emit("connection", ws, request);
    });
  });

  wss.on("connection", (ws) => {
    const client: Client = {
      ws,
      userId: null,
      joinedOrders: new Set(),
      lastLocationAt: 0,
    };

    clients.add(client);

    send(client, {
      type: "connected",
      message: "Authenticate with { type: 'auth', accessToken }",
    });

    ws.on("message", async (raw) => {
      try {
        const message = JSON.parse(raw.toString()) as IncomingMessage;

        switch (message.type) {
          case "auth":
            await authenticate(client, message.accessToken);
            break;

          case "order:join":
            await joinOrder(client, message.orderId);
            break;

          case "order:location:update":
            await updateSellerLocation(client, message);
            break;

          default:
            send(client, { type: "error", message: "Unknown message type" });
        }
      } catch (error) {
        send(client, {
          type: "error",
          message: error instanceof Error ? error.message : "WebSocket request failed",
        });
      }
    });

    ws.on("close", () => cleanupClient(client));
    ws.on("error", () => cleanupClient(client));
  });

  return wss;
}
