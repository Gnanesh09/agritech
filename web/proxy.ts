import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function proxy(request: NextRequest) {
  const refreshToken =
    request.cookies.get("refreshToken")?.value;

  const { pathname } = request.nextUrl;

  // =========================================================
  // PUBLIC AUTH PAGES
  // =========================================================

  const isUserLoginPage = pathname === "/login";
  const isAdminLoginPage = pathname === "/admin";

  // =========================================================
  // PRIVATE ROUTES
  // =========================================================

  const isUserPrivateRoute =
    pathname === "/home" ||
    pathname.startsWith("/home/") ||
    pathname === "/profile" ||
    pathname.startsWith("/profile/");

  const isAdminPrivateRoute =
    pathname === "/admin/dashboard" ||
    pathname.startsWith("/admin/dashboard/");

  const isSuperAdminPrivateRoute =
    pathname === "/superadmin/dashboard" ||
    pathname.startsWith("/superadmin/dashboard/");

  // =========================================================
  // USER LOGIN
  // =========================================================

  /*
   * If already authenticated and they visit /login,
   * send them to /home.
   *
   * NOTE:
   * This assumes /login is for normal users.
   */
  if (refreshToken && isUserLoginPage) {
    return NextResponse.redirect(
      new URL("/home", request.url)
    );
  }

  // =========================================================
  // USER PRIVATE ROUTES
  // =========================================================

  if (!refreshToken && isUserPrivateRoute) {
    return NextResponse.redirect(
      new URL("/login", request.url)
    );
  }

  // =========================================================
  // ADMIN DASHBOARD
  // =========================================================

  if (!refreshToken && isAdminPrivateRoute) {
    return NextResponse.redirect(
      new URL("/admin", request.url)
    );
  }

  // =========================================================
  // SUPER ADMIN DASHBOARD
  // =========================================================

  if (!refreshToken && isSuperAdminPrivateRoute) {
    return NextResponse.redirect(
      new URL("/admin", request.url)
    );
  }

  // =========================================================
  // OTHERWISE
  // =========================================================

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