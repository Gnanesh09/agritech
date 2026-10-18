import { getAccessToken } from "./auth-storage";

/**
 * Lightweight native WebSocket client for crop lifecycle events.
 * Uses the same EXPO_PUBLIC_MARKETPLACE_WS_URL as the existing marketplace
 * socket. Server messages should contain `type`/`event` and a `cropCycle`,
 * `cycle`, `payload`, or `data` object.
 */
export type CropHarvestSocketMessage = {
  type?: string;
  event?: string;
  name?: string;
  cropCycle?: any;
  cycle?: any;
  payload?: any;
  data?: any;
  [key: string]: any;
};

export type CropHarvestSocketStatus = (connected: boolean) => void;
export type CropHarvestSocketListener = (message: CropHarvestSocketMessage) => void;

const API_URL =
  process.env.EXPO_PUBLIC_API_URL ?? "http://10.193.242.210:5000/api";
const DEFAULT_WS_URL = API_URL
  .replace(/^https:/i, "wss:")
  .replace(/^http:/i, "ws:")
  .replace(/\/api\/?$/i, "");
const WS_URL = (process.env.EXPO_PUBLIC_MARKETPLACE_WS_URL ?? DEFAULT_WS_URL).trim();

function withToken(url: string, token: string | null) {
  const separator = url.includes("?") ? "&" : "?";
  return `${url}${separator}token=${encodeURIComponent(token ?? "")}`;
}

export function subscribeToCropHarvestEvents(
  onMessage: CropHarvestSocketListener,
  onStatus?: CropHarvestSocketStatus,
) {
  let disposed = false;
  let socket: WebSocket | null = null;
  let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  let reconnectDelay = 1000;
  let connecting = false;

  const clearReconnect = () => {
    if (reconnectTimer) clearTimeout(reconnectTimer);
    reconnectTimer = null;
  };

  const scheduleReconnect = () => {
    if (disposed || reconnectTimer) return;
    reconnectTimer = setTimeout(() => {
      reconnectTimer = null;
      void connect();
    }, reconnectDelay);
    reconnectDelay = Math.min(Math.round(reconnectDelay * 1.7), 20000);
  };

  const connect = async () => {
    if (disposed || connecting) return;
    if (socket && (socket.readyState === WebSocket.OPEN || socket.readyState === WebSocket.CONNECTING)) return;

    connecting = true;
    try {
      const token = await getAccessToken();
      if (disposed) return;
      if (!token) {
        connecting = false;
        onStatus?.(false);
        scheduleReconnect();
        return;
      }

      const nextSocket = new WebSocket(withToken(WS_URL, token));
      socket = nextSocket;

      nextSocket.onopen = () => {
        connecting = false;
        reconnectDelay = 1000;
        onStatus?.(true);
        try {
          // The WebSocket server should authorize this user from the token and
          // subscribe them to crop lifecycle events for their own trays.
          nextSocket.send(JSON.stringify({ type: "crop:subscribe" }));
        } catch {
          // A transient send failure will be recovered by reconnect logic.
        }
      };

      nextSocket.onmessage = (event) => {
        if (disposed) return;
        try {
          const payload = JSON.parse(String(event.data));
          if (payload && typeof payload === "object") onMessage(payload as CropHarvestSocketMessage);
        } catch {
          // Ignore malformed/unrelated frames; REST remains the initial snapshot source.
        }
      };

      nextSocket.onerror = () => {
        // onclose performs the single reconnect path.
        try { nextSocket.close(); } catch { /* socket already closed */ }
      };

      nextSocket.onclose = () => {
        connecting = false;
        if (socket === nextSocket) socket = null;
        onStatus?.(false);
        scheduleReconnect();
      };
    } catch {
      connecting = false;
      onStatus?.(false);
      scheduleReconnect();
    }
  };

  void connect();

  return () => {
    disposed = true;
    connecting = false;
    clearReconnect();
    const activeSocket = socket;
    socket = null;
    if (activeSocket) {
      activeSocket.onopen = null;
      activeSocket.onmessage = null;
      activeSocket.onerror = null;
      activeSocket.onclose = null;
      try { activeSocket.close(); } catch { /* already closed */ }
    }
    onStatus?.(false);
  };
}
