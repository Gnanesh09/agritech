import { NextResponse } from "next/server";
import { cookies } from "next/headers";

const apiUrl = process.env.NEXT_PUBLIC_API_URL;

export async function GET() {
  try {
    if (!apiUrl) {
      return NextResponse.json(
        {
          message: "NEXT_PUBLIC_API_URL is not configured",
        },
        { status: 500 },
      );
    }

    const cookieStore = await cookies();

    const refreshToken = cookieStore.get("refreshToken")?.value;

    if (!refreshToken) {
      return NextResponse.json(
        {
          message: "Refresh token not found",
        },
        { status: 401 },
      );
    }

    const backendResponse = await fetch(`${apiUrl}/api/auth/refresh-token`, {
      method: "GET",
      headers: {
        Cookie: `refreshToken=${refreshToken}`,
      },
      cache: "no-store",
    });

    const data = await backendResponse.json();

    if (!backendResponse.ok) {
      cookieStore.delete("refreshToken");

      return NextResponse.json(
        {
          message: data.message || "Invalid refresh token",
        },
        {
          status: backendResponse.status,
        },
      );
    }

    // Backend rotates the refresh token.
    const setCookie = backendResponse.headers.get("set-cookie");

    if (setCookie) {
      const match = setCookie.match(/refreshToken=([^;]+)/);

      if (match?.[1]) {
        cookieStore.set("refreshToken", match[1], {
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          sameSite: "lax",
          maxAge: 7 * 24 * 60 * 60,
          path: "/",
        });
      }
    }

    return NextResponse.json(
      {
        message: data.message,
        accessToken: data.accessToken,
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("[REFRESH ROUTE] Error:", error);

    return NextResponse.json(
      {
        message: "Failed to refresh session",
      },
      { status: 500 },
    );
  }
}
