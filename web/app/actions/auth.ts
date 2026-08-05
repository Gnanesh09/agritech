// app/actions/auth.ts
"use server";

import { cookies } from "next/headers";

// 1. We receive the email and password directly from the frontend
export async function loginServerAction(email: string, password: string) {
  try {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3050";
    
    // 2. Next.js talks to Express securely on the backend
    const res = await fetch(`${apiUrl}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
      cache: "no-store",
    });

    const data = await res.json();

    if (!res.ok) {
      return { success: false, error: data.message || "Login failed" };
    }

    // 3. Extract the cookie that Express created and set it in Next.js
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
          maxAge: 7 * 24 * 60 * 60, // 7 days
        });
      }
    }

    // 4. Return success to the frontend
    return { success: true, user: data.user, accessToken: data.accessToken };
  } catch (error) {
    return { success: false, error: "Server connection failed" };
  }
}

export async function logoutServerAction() {
  try {
    const cookieStore = await cookies();
    const refreshToken = cookieStore.get("refreshToken")?.value;

    if (refreshToken) {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3050";
      
      // 1. Tell the Express backend to revoke the session in the database
      await fetch(`${apiUrl}/api/auth/logout`, {
        method: "GET",
        headers: {
          // Manually pass the cookie to Express so it knows who is logging out
          Cookie: `refreshToken=${refreshToken}` 
        },
        cache: "no-store",
      });
    }

    // 2. Delete the cookie from the Next.js frontend
    cookieStore.delete("refreshToken");

    return { success: true };
  } catch (error) {
    console.error("Server Action Logout Error:", error);
    
    // Even if Express fails, force delete the local Next.js cookie 
    // so the user isn't permanently stuck logged in
    const cookieStore = await cookies();
    cookieStore.delete("refreshToken");
    
    return { success: false, error: "Failed to log out from server, but local session cleared." };
  }
}