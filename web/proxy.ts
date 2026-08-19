import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function proxy(request: NextRequest) {
  const refreshToken = request.cookies.get("refreshToken")?.value;

  const { pathname } = request.nextUrl;

  // =========================================================
  // PUBLIC AUTH PAGES
  // =========================================================

  const isUserLoginPage = pathname === "/login";

  const isAdminLoginPage = pathname === "/admin";

  // =========================================================
  // USER PRIVATE ROUTES
  // =========================================================

  const isUserPrivateRoute =
    pathname === "/home" ||
    pathname.startsWith("/home/") ||
    pathname === "/profile" ||
    pathname.startsWith("/profile/");

  // =========================================================
  // ADMIN PRIVATE ROUTES
  // =========================================================

  const isAdminPrivateRoute =
    pathname === "/admin/dashboard" || pathname.startsWith("/admin/dashboard/");

  // =========================================================
  // SUPER ADMIN PRIVATE ROUTES
  // =========================================================

  const isSuperAdminPrivateRoute =
    pathname === "/superadmin/dashboard" ||
    pathname.startsWith("/superadmin/dashboard/");

  // =========================================================
  // USER LOGIN
  // =========================================================

  if (refreshToken && isUserLoginPage) {
    return NextResponse.redirect(new URL("/home", request.url));
  }

  // =========================================================
  // ADMIN LOGIN
  //
  // For now, just prevent an already-authenticated user
  // from unnecessarily staying on /admin.
  //
  // Actual ADMIN / SUPER_ADMIN authorization is handled
  // by your backend/auth layer.
  // =========================================================

  if (refreshToken && isAdminLoginPage) {
    return NextResponse.redirect(new URL("/admin/dashboard", request.url));
  }

  // =========================================================
  // USER PRIVATE ROUTES
  // =========================================================

  if (!refreshToken && isUserPrivateRoute) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // =========================================================
  // ADMIN PRIVATE ROUTES
  // =========================================================

  if (!refreshToken && isAdminPrivateRoute) {
    return NextResponse.redirect(new URL("/admin", request.url));
  }

  // =========================================================
  // SUPER ADMIN PRIVATE ROUTES
  // =========================================================

  if (!refreshToken && isSuperAdminPrivateRoute) {
    return NextResponse.redirect(new URL("/admin", request.url));
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

    // Admin auth + dashboard
    "/admin",
    "/admin/dashboard/:path*",

    // Super admin
    "/superadmin/dashboard/:path*",
  ],
};
