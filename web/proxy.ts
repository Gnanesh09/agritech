import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // =========================================================
  // PUBLIC AUTH PAGES
  // =========================================================

  const isUserLoginPage = pathname === "/login";
  const isAdminLoginPage = pathname === "/admin";

  // =========================================================
  // PRIVATE USER ROUTES
  // =========================================================

  const isUserPrivateRoute =
    pathname === "/home" ||
    pathname.startsWith("/home/") ||
    pathname === "/profile" ||
    pathname.startsWith("/profile/");

  // =========================================================
  // ADMIN ROUTES
  // =========================================================

  const isAdminPrivateRoute =
    pathname === "/admin/dashboard" ||
    pathname.startsWith("/admin/dashboard/");

  // =========================================================
  // SUPER ADMIN ROUTES
  // =========================================================

  const isSuperAdminPrivateRoute =
    pathname === "/superadmin/dashboard" ||
    pathname.startsWith("/superadmin/dashboard/");


  // =========================================================
  // IMPORTANT
  //
  // Authentication for user API requests is handled by:
  //
  // Axios
  //   ↓
  // access token
  //   ↓
  // refresh token
  //   ↓
  // backend protectRoute
  //
  // Therefore proxy does NOT redirect /home based on
  // refreshToken anymore.
  // =========================================================


  // =========================================================
  // PUBLIC USER LOGIN
  // =========================================================

  if (isUserLoginPage) {
    return NextResponse.next();
  }


  // =========================================================
  // USER PRIVATE ROUTES
  // =========================================================

  if (isUserPrivateRoute) {
    return NextResponse.next();
  }


  // =========================================================
  // ADMIN
  //
  // Keep these protected separately for now.
  // =========================================================

  if (isAdminPrivateRoute) {
    const refreshToken =
      request.cookies.get("refreshToken")?.value;

    if (!refreshToken) {
      return NextResponse.redirect(
        new URL("/admin", request.url)
      );
    }

    return NextResponse.next();
  }


  // =========================================================
  // SUPER ADMIN
  // =========================================================

  if (isSuperAdminPrivateRoute) {
    const refreshToken =
      request.cookies.get("refreshToken")?.value;

    if (!refreshToken) {
      return NextResponse.redirect(
        new URL("/admin", request.url)
      );
    }

    return NextResponse.next();
  }


  return NextResponse.next();
}


export const config = {
  matcher: [
    "/login",
    "/home/:path*",
    "/profile/:path*",
    "/admin",
    "/admin/dashboard/:path*",
    "/superadmin/dashboard/:path*",
  ],
};