import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { verifyAccessToken } from "./lib/token";

export const config = {
  matcher: ["/dashboard/:path*", "/boards/:path*", "/profile/:path*", "/login", "/register"],
};
const ALLOWED_REDIRECT_PATHS = /^\/[a-zA-Z0-9\-_/?=&]*$/;

export async function proxy(request: NextRequest) {
  const url = request.nextUrl;
  const token = request.cookies.get("accessToken")?.value;

  const isAuthPage = url.pathname.startsWith("/login") || url.pathname.startsWith("/register");
  const isProtectedPage =
    url.pathname.startsWith("/dashboard") ||
    url.pathname.startsWith("/boards") ||
    url.pathname.startsWith("/profile");

  if (token && isAuthPage) {
    const payload = await verifyAccessToken(token);
    if (payload) {
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }
    // Invalid/expired — clear it, let them stay on the auth page
    const response = NextResponse.next();
    response.cookies.delete("accessToken");
    return response;
  }

  if (isProtectedPage) {
    if (!token) {
      return NextResponse.redirect(new URL("/login", request.url));
    }
    const payload = await verifyAccessToken(token);
    if (payload) {
      return NextResponse.next();
    }
    // Could be expired OR malformed — verifyAccessToken no longer distinguishes.
    // Attempt refresh; refresh route itself will bounce to /login if the refresh token is also invalid.
    const rawNext = url.pathname;
    const safeNext = ALLOWED_REDIRECT_PATHS.test(rawNext) ? rawNext : "/dashboard";
    return NextResponse.redirect(
      new URL(`/api/auth/refresh?next=${encodeURIComponent(safeNext)}`, request.url)
    );
  }

  return NextResponse.next();
}
