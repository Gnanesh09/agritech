import axios, {
    type AxiosError,
    type InternalAxiosRequestConfig,
} from "axios";

const apiUrl = process.env.NEXT_PUBLIC_API_URL;

if (!apiUrl) {
    console.error(
        "NEXT_PUBLIC_API_URL environment variable is not set"
    );
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

export function setAccessToken(token: string) {
    accessToken = token;

    console.log(
        "[AUTH] Access token stored"
    );
}

export function clearAccessToken() {
    accessToken = null;

    console.log(
        "[AUTH] Access token cleared"
    );
}


// ======================================================
// REQUEST INTERCEPTOR
// ======================================================

api.interceptors.request.use(
    (config) => {

        if (accessToken) {

            config.headers =
                config.headers || {};

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

let refreshPromise: Promise<string> | null = null;


// ======================================================
// REFRESH ACCESS TOKEN
// ======================================================

async function refreshAccessToken(): Promise<string> {

    /*
     * IMPORTANT:
     *
     * Use plain axios here, NOT `api`.
     *
     * This prevents the refresh request from
     * entering the normal 401 interceptor again.
     */

    const response = await axios.get(
        `${apiUrl}/api/auth/refresh-token`,
        {
            withCredentials: true,
        }
    );

    const newAccessToken =
        response.data?.accessToken;

    if (!newAccessToken) {
        throw new Error(
            "Refresh endpoint did not return an access token"
        );
    }

    setAccessToken(
        newAccessToken
    );

    console.log(
        "[AUTH] Access token refreshed successfully"
    );

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

        const originalRequest =
            error.config as
                | (InternalAxiosRequestConfig & {
                      _retry?: boolean;
                  })
                | undefined;


        // ------------------------------------------------
        // Not a 401
        // ------------------------------------------------

        if (
            error.response?.status !== 401 ||
            !originalRequest
        ) {
            return Promise.reject(error);
        }


        // ------------------------------------------------
        // Never refresh the refresh endpoint
        // ------------------------------------------------

        if (
            originalRequest.url?.includes(
                "/auth/refresh-token"
            )
        ) {

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
             * wait for EXACTLY the same promise.
             *
             * This is the important part.
             */

            if (!refreshPromise) {

                console.log(
                    "[AUTH] Starting token refresh..."
                );

                refreshPromise =
                    refreshAccessToken()
                        .finally(() => {

                            refreshPromise =
                                null;

                        });
            } else {

                console.log(
                    "[AUTH] Waiting for existing refresh..."
                );
            }


            const newToken =
                await refreshPromise;


            // ------------------------------------------------
            // Retry original request
            // ------------------------------------------------

            originalRequest.headers =
                originalRequest.headers || {};

            originalRequest.headers.Authorization =
                `Bearer ${newToken}`;


            console.log(
                "[AUTH] Retrying:",
                originalRequest.url
            );


            return api(
                originalRequest
            );

        } catch (refreshError) {

            console.error(
                "[AUTH] Refresh failed:",
                refreshError
            );

            clearAccessToken();

            return Promise.reject(
                refreshError
            );
        }
    }
);


export default api;