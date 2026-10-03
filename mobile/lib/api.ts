import {
  getAccessToken,
  removeAccessToken,
  saveAccessToken,
} from "./auth-storage";

const API_URL =
  process.env.EXPO_PUBLIC_API_URL ?? "http://10.77.167.210:5000/api";

type ApiOptions = RequestInit & {
  skipRefresh?: boolean;
};

let refreshPromise: Promise<string | null> | null = null;

async function refreshAccessToken() {
  if (refreshPromise) {
    return refreshPromise;
  }

  refreshPromise = (async () => {
    try {
      const response = await fetch(`${API_URL}/auth/refresh-token`, {
        method: "GET",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        return null;
      }

      const data = await response.json();

      if (!data?.accessToken) {
        return null;
      }

      await saveAccessToken(data.accessToken);

      return data.accessToken;
    } catch (error) {
      console.log("[AUTH] Refresh request failed:", error);

      return null;
    } finally {
      refreshPromise = null;
    }
  })();

  return refreshPromise;
}

async function makeRequest(
  endpoint: string,
  options: RequestInit,
  token: string | null,
) {
  const headers = new Headers(options.headers);

  headers.set("Content-Type", "application/json");

  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  return fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers,
    credentials: "include",
  });
}

export async function apiRequest(endpoint: string, options: ApiOptions = {}) {
  const { skipRefresh = false, ...requestOptions } = options;

  let token = await getAccessToken();

  let response = await makeRequest(endpoint, requestOptions, token);

  const shouldRefresh =
    !skipRefresh &&
    response.status === 401 &&
    endpoint !== "/auth/login" &&
    endpoint !== "/auth/register" &&
    endpoint !== "/auth/verify-email" &&
    endpoint !== "/auth/refresh-token";

  if (shouldRefresh) {
    console.log("[AUTH] Access token expired. Refreshing...");

    const newToken = await refreshAccessToken();

    if (newToken) {
      token = newToken;

      response = await makeRequest(endpoint, requestOptions, token);
    } else {
      await removeAccessToken();

      throw new Error("SESSION_EXPIRED");
    }
  }

  let data: any = null;

  const contentType = response.headers.get("content-type");

  if (contentType?.includes("application/json")) {
    data = await response.json();
  }

  if (!response.ok) {
    throw new Error(
      data?.message || data?.error?.message || "Something went wrong.",
    );
  }

  return data;
}

export { refreshAccessToken };
