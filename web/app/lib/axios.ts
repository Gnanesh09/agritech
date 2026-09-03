import axios, { type AxiosError, type InternalAxiosRequestConfig } from "axios";

const apiUrl = process.env.NEXT_PUBLIC_API_URL;

if (!apiUrl) {
  console.error("NEXT_PUBLIC_API_URL environment variable is not set");
}

// ======================================================
// AXIOS INSTANCE
// ======================================================

const api = axios.create({
  baseURL: `${apiUrl}/api`,
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
  },
});

// ======================================================
// ACCESS TOKEN
// ======================================================

let accessToken: string | null = null;

// Prevent refresh requests while logout is happening.
let isLoggingOut = false;

export function setAccessToken(token: string) {
  // Never allow a refresh request to restore authentication
  // while the user is logging out.
  if (isLoggingOut) {
    console.log("[AUTH] Ignoring access token because logout is in progress");
    return;
  }

  accessToken = token;

  console.log("[AUTH] Access token stored");
}

export function clearAccessToken() {
  accessToken = null;

  console.log("[AUTH] Access token cleared");
}

export function startLogout() {
  isLoggingOut = true;
  accessToken = null;

  console.log("[AUTH] Logout started");
}

export function finishLogout() {
  isLoggingOut = false;

  console.log("[AUTH] Logout finished");
}

// ======================================================
// REQUEST INTERCEPTOR
// ======================================================

api.interceptors.request.use(
  (config) => {
    if (accessToken && !isLoggingOut) {
      config.headers = config.headers || {};

      config.headers.Authorization = `Bearer ${accessToken}`;
    }

    return config;
  },

  (error) => {
    return Promise.reject(error);
  },
);

// ======================================================
// REFRESH STATE
// ======================================================

let refreshPromise: Promise<string> | null = null;

// ======================================================
// REFRESH ACCESS TOKEN
// ======================================================

async function refreshAccessToken(): Promise<string> {
  /*
   * IMPORTANT:
   *
   * Refresh through the Next.js route.
   *
   * Do NOT call the backend refresh endpoint directly
   * from the browser.
   *
   * Next.js owns the refreshToken cookie and forwards it
   * to the backend. It also stores the rotated refresh token.
   */

  if (isLoggingOut) {
    throw new Error("Logout is already in progress");
  }

  const response = await axios.get("/api/auth/refresh-token", {
    withCredentials: true,
  });

  const newAccessToken = response.data?.accessToken;

  if (!newAccessToken) {
    throw new Error("Refresh endpoint did not return an access token");
  }

  setAccessToken(newAccessToken);

  console.log("[AUTH] Access token refreshed successfully");

  return newAccessToken;
}

// ======================================================
// RESPONSE INTERCEPTOR
// ======================================================

api.interceptors.response.use(
  // --------------------------------------------------
  // Normal response
  // --------------------------------------------------

  (response) => {
    return response;
  },

  // --------------------------------------------------
  // Error
  // --------------------------------------------------

  async (error: AxiosError) => {
    const originalRequest = error.config as
      | (InternalAxiosRequestConfig & {
          _retry?: boolean;
        })
      | undefined;

    // ------------------------------------------------
    // LOGOUT IN PROGRESS
    // ------------------------------------------------

    /*
     * Do NOT refresh if the user has clicked logout.
     *
     * This prevents:
     *
     * logout
     *   ↓
     * background API request → 401
     *   ↓
     * refresh
     *   ↓
     * user becomes authenticated again
     */

    if (isLoggingOut) {
      console.log("[AUTH] Ignoring 401 because logout is in progress");

      return Promise.reject(error);
    }

    // ------------------------------------------------
    // Not a 401
    // ------------------------------------------------

    if (error.response?.status !== 401 || !originalRequest) {
      return Promise.reject(error);
    }

    // ------------------------------------------------
    // Never refresh the refresh endpoint
    // ------------------------------------------------

    if (originalRequest.url?.includes("/auth/refresh-token")) {
      clearAccessToken();

      return Promise.reject(error);
    }

    // ------------------------------------------------
    // Prevent infinite retry
    // ------------------------------------------------

    if (originalRequest._retry) {
      return Promise.reject(error);
    }

    originalRequest._retry = true;

    // =================================================
    // REFRESH
    // =================================================

    try {
      /*
       * If another request is already refreshing,
       * wait for the SAME refresh promise.
       */

      if (!refreshPromise) {
        console.log("[AUTH] Starting token refresh...");

        refreshPromise = refreshAccessToken().finally(() => {
          refreshPromise = null;
        });
      } else {
        console.log("[AUTH] Waiting for existing refresh...");
      }

      const newToken = await refreshPromise;

      // ------------------------------------------------
      // Logout may have started while refresh was running
      // ------------------------------------------------

      if (isLoggingOut) {
        console.log("[AUTH] Logout started during refresh");

        clearAccessToken();

        return Promise.reject(
          new Error("Request cancelled because logout is in progress"),
        );
      }

      // ------------------------------------------------
      // Retry original request
      // ------------------------------------------------

      originalRequest.headers = originalRequest.headers || {};

      originalRequest.headers.Authorization = `Bearer ${newToken}`;

      console.log("[AUTH] Retrying:", originalRequest.url);

      return api(originalRequest);
    } catch (refreshError) {
      console.error("[AUTH] Refresh failed:", refreshError);

      clearAccessToken();

      return Promise.reject(refreshError);
    }
  },
);

// ======================================================
// EXPORT
// ======================================================

export default api;
