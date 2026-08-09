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
// REFRESH TOKEN
// ======================================================

let isRefreshing = false;

let refreshSubscribers: Array<(token: string) => void> = [];

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

    // Normal response
    (response) => {
        return response;
    },

    async (error) => {

        const originalRequest = error.config;

        // Only handle 401
        if (
            error.response?.status !== 401 ||
            originalRequest?._retry
        ) {
            return Promise.reject(error);
        }

        // Don't try to refresh the refresh endpoint itself
        if (
            originalRequest?.url?.includes(
                "/auth/refresh-token"
            )
        ) {
            clearAccessToken();

            return Promise.reject(error);
        }


        originalRequest._retry = true;


        // ==================================================
        // ANOTHER REQUEST IS ALREADY REFRESHING
        // ==================================================

        if (isRefreshing) {

            return new Promise((resolve) => {

                subscribeTokenRefresh(
                    (token) => {

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

            const response = await api.get(
                "/auth/refresh-token"
            );

            const newAccessToken =
                response.data.accessToken;

            if (!newAccessToken) {
                throw new Error(
                    "No access token returned"
                );
            }


            // Store new token
            setAccessToken(
                newAccessToken
            );


            // Resolve queued requests
            onRefreshed(
                newAccessToken
            );


            // Retry original request
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