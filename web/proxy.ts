import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Notice we changed "middleware" to "proxy" here!
export function proxy(request: NextRequest) {
  // 1. Check if the user has a refreshToken cookie
  const refreshToken = request.cookies.get('refreshToken')?.value;
  
  // 2. Get the current URL path (e.g., /login, /home)
  const { pathname } = request.nextUrl;

  // 3. If they HAVE a token and try to visit the login page -> Redirect to /home
  if (refreshToken && pathname === '/login') {
    return NextResponse.redirect(new URL('/home', request.url));
  }

  // 4. Protect your private routes. If they DON'T have a token and try to visit /home -> Redirect to /login
  const isPrivateRoute = pathname.startsWith('/home') || pathname.startsWith('/profile');
  
  if (!refreshToken && isPrivateRoute) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // Otherwise, let them proceed normally
  return NextResponse.next();
}

// 5. Tell Next.js which routes this proxy should run on
export const config = {
  matcher: ['/login', '/home/:path*', '/profile/:path*'],
};