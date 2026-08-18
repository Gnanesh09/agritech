// lib/axios.ts

import axios from "axios";

const apiUrl = process.env.NEXT_PUBLIC_API_URL;

if (!apiUrl) {
    console.error(
        "NEXT_PUBLIC_API_URL environment variable is not set"
    );
}

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

export function setAccessToken(token: string) {
    accessToken = token;
}

export function clearAccessToken() {
    accessToken = null;
}


// ======================================================
// REQUEST INTERCEPTOR
// ======================================================

api.interceptors.request.use(
    (config) => {

        if (accessToken) {
            config.headers.Authorization =
                `Bearer ${accessToken}`;
        }

        return config;
    },

    (error) => {
        return Promise.reject(error);
    }
);


// ======================================================
// REFRESH STATE
// ======================================================

let isRefreshing = false;

let refreshSubscribers: Array<
    (token: string) => void
> = [];

function subscribeTokenRefresh(
    callback: (token: string) => void
) {
    refreshSubscribers.push(callback);
}

function onRefreshed(token: string) {

    refreshSubscribers.forEach(
        (callback) => callback(token)
    );

    refreshSubscribers = [];
}


// ======================================================
// RESPONSE INTERCEPTOR
// ======================================================

api.interceptors.response.use(

    (response) => {
        return response;
    },

    async (error) => {

        const originalRequest =
            error.config;

        // --------------------------------------------------
        // Only handle 401
        // --------------------------------------------------

        if (
            error.response?.status !== 401 ||
            !originalRequest
        ) {
            return Promise.reject(error);
        }

        // --------------------------------------------------
        // Never refresh the refresh endpoint itself
        // --------------------------------------------------

        if (
            originalRequest.url?.includes(
                "/auth/refresh-token"
            )
        ) {
            clearAccessToken();

            return Promise.reject(error);
        }

        // --------------------------------------------------
        // Prevent infinite retry
        // --------------------------------------------------

        if (originalRequest._retry) {
            return Promise.reject(error);
        }

        originalRequest._retry = true;


        // ==================================================
        // ANOTHER REQUEST IS ALREADY REFRESHING
        // ==================================================

        if (isRefreshing) {

            return new Promise((resolve, reject) => {

                subscribeTokenRefresh(
                    (token) => {

                        originalRequest.headers =
                            originalRequest.headers || {};

                        originalRequest.headers.Authorization =
                            `Bearer ${token}`;

                        resolve(
                            api(originalRequest)
                        );
                    }
                );

            });
        }


        // ==================================================
        // START REFRESH
        // ==================================================

        isRefreshing = true;

        try {

            /*
             * IMPORTANT:
             *
             * Do NOT use `api.get()` here.
             *
             * Use a separate axios request so the
             * refresh request itself doesn't participate
             * in the normal interceptor chain.
             */

            const response = await axios.get(
                `${apiUrl}/api/auth/refresh-token`,
                {
                    withCredentials: true,
                }
            );


            const newAccessToken =
                response.data.accessToken;

            if (!newAccessToken) {
                throw new Error(
                    "No access token returned"
                );
            }


            // ------------------------------------------------
            // Store new access token
            // ------------------------------------------------

            setAccessToken(
                newAccessToken
            );


            // ------------------------------------------------
            // Resolve waiting requests
            // ------------------------------------------------

            onRefreshed(
                newAccessToken
            );


            // ------------------------------------------------
            // Retry original request
            // ------------------------------------------------

            originalRequest.headers =
                originalRequest.headers || {};

            originalRequest.headers.Authorization =
                `Bearer ${newAccessToken}`;

            return api(originalRequest);

        } catch (refreshError) {

            clearAccessToken();

            refreshSubscribers = [];

            return Promise.reject(
                refreshError
            );

        } finally {

            isRefreshing = false;

        }

    }
);


export default api;