// app/actions/auth.ts
"use server";

import { cookies } from "next/headers";

const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";

/**
 * LOGIN
 */
export async function loginServerAction(email: string, password: string) {
  try {
    const res = await fetch(`${apiUrl}/api/auth/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email,
        password,
      }),
      cache: "no-store",
    });

    const data = await res.json();

    if (!res.ok) {
      return {
        success: false,
        error: data.message || "Login failed",
      };
    }

    const setCookieHeader = res.headers.get("set-cookie");

    if (setCookieHeader) {
      const tokenMatch = setCookieHeader.match(/refreshToken=([^;]+)/);

      if (tokenMatch) {
        const cookieStore = await cookies();

        cookieStore.set({
          name: "refreshToken",
          value: tokenMatch[1],
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          sameSite: "lax",
          maxAge: 7 * 24 * 60 * 60,
          path: "/",
        });
      }
    }

    return {
      success: true,
      user: data.user,
      accessToken: data.accessToken,
    };
  } catch (error) {
    console.error("Login Server Action Error:", error);

    return {
      success: false,
      error: "Server connection failed",
    };
  }
}

/**
 * REGISTER
 */
export async function registerServerAction(userData: {
  username: string;
  email: string;
  password: string;
  countryCode: string;
  phoneNo: string;
  role: "USER" | "ADMIN" | "SUPER_ADMIN";
}) {
  try {
    const res = await fetch(`${apiUrl}/api/auth/register`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },

      // IMPORTANT:
      // Pass the role received from the page.
      // Do NOT overwrite it with USER.
      body: JSON.stringify(userData),

      cache: "no-store",
    });

    const data = await res.json();

    if (!res.ok) {
      return {
        success: false,
        error: data.message || "Registration failed",
      };
    }

    return {
      success: true,
      user: data.user,
      message: data.message,
    };
  } catch (error) {
    console.error("Register Server Action Error:", error);

    return {
      success: false,
      error: "Server connection failed",
    };
  }
}
/**
 * VERIFY EMAIL / OTP
 */
export async function verifyEmailServerAction(email: string, otp: string) {
  try {
    const res = await fetch(`${apiUrl}/api/auth/verify-email`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email,
        otp,
      }),
      cache: "no-store",
    });

    const data = await res.json();

    if (!res.ok) {
      return {
        success: false,
        error: data.message || "Invalid verification code",
      };
    }

    // Express created the refreshToken.
    // Capture it and store it in Next.js.
    const setCookieHeader = res.headers.get("set-cookie");

    if (setCookieHeader) {
      const tokenMatch = setCookieHeader.match(/refreshToken=([^;]+)/);

      if (tokenMatch) {
        const cookieStore = await cookies();

        cookieStore.set({
          name: "refreshToken",
          value: tokenMatch[1],
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          sameSite: "lax",
          maxAge: 7 * 24 * 60 * 60,
          path: "/",
        });
      }
    }

    return {
      success: true,
      user: data.user,
      accessToken: data.accessToken,
    };
  } catch (error) {
    console.error("Verify Email Server Action Error:", error);

    return {
      success: false,
      error: "Server connection failed",
    };
  }
}

/**
 * LOGOUT
 */
export async function logoutServerAction() {
  try {
    const cookieStore = await cookies();
    const refreshToken = cookieStore.get("refreshToken")?.value;

    if (refreshToken) {
      await fetch(`${apiUrl}/api/auth/logout`, {
        method: "GET",
        headers: {
          Cookie: `refreshToken=${refreshToken}`,
        },
        cache: "no-store",
      });
    }

    cookieStore.delete("refreshToken");

    return {
      success: true,
    };
  } catch (error) {
    console.error("Server Action Logout Error:", error);

    const cookieStore = await cookies();

    cookieStore.delete("refreshToken");

    return {
      success: false,
      error: "Failed to log out from server, but local session cleared.",
    };
  }
}
