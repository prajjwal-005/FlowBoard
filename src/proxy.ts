// import { NextResponse } from "next/server";
// import type { NextRequest } from "next/server";
// import { verifyAccessToken } from "./lib/token";
// import { safeNextPath } from "./lib/safe-next-path";

// export const config = {
//   matcher: ["/dashboard/:path*", "/boards/:path*", "/profile/:path*", "/login", "/register"],
// };

// export async function proxy(request: NextRequest) {
//   const url = request.nextUrl;
//   const accessToken = request.cookies.get("accessToken")?.value;
//   const refreshToken = request.cookies.get("refreshToken")?.value;
//   const isAuthPage = url.pathname.startsWith("/login") || url.pathname.startsWith("/register");
//   const isProtectedPage =
//     url.pathname.startsWith("/dashboard") ||
//     url.pathname.startsWith("/boards") ||
//     url.pathname.startsWith("/profile");

//   if (accessToken && isAuthPage) {
//     const payload = await verifyAccessToken(accessToken);
//     if (payload) {
//       return NextResponse.redirect(new URL("/dashboard", request.url));
//     }
//     // Invalid/expired — clear it, let them stay on the auth page
//     const response = NextResponse.next();
//     response.cookies.delete("accessToken");
//     return response;
//   }

//   if (isProtectedPage) {
//     const rawNext = url.pathname;
//     const safeNext = safeNextPath(rawNext);
    
//     if(!accessToken){
//       if(refreshToken){
//        return NextResponse.redirect(
//         new URL(`/api/auth/refresh?next=${encodeURIComponent(safeNext)}`, request.url)
//       );
//       }
//       else{
//         return NextResponse.redirect(new URL("/login", request.url));
//       }
//     }
//     const payload = await verifyAccessToken(accessToken);
//     if (payload) {
//       return NextResponse.next();
//     }
//     // Could be expired OR malformed — verifyAccessToken no longer distinguishes.
//     // Attempt refresh; refresh route itself will bounce to /login if the refresh token is also invalid.
    
//   }

//   return NextResponse.next();
// }

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { verifyAccessToken } from "./lib/token";
import { safeNextPath } from "./lib/safe-next-path";
import { clearAccessCookie,} from "./lib/auth/auth-cookies";
import { loginRedirect } from "./lib/auth/login-redirect";

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/boards/:path*",
    "/profile/:path*",
    "/login",
    "/register",
  ],
};

export async function proxy(request: NextRequest) {
  const url = request.nextUrl;

  const token = request.cookies.get("accessToken")?.value;
  const refreshToken =
    request.cookies.get("refreshToken")?.value;

  const isAuthPage =
    url.pathname.startsWith("/login") ||
    url.pathname.startsWith("/register");

  const isProtectedPage =
    url.pathname.startsWith("/dashboard") ||
    url.pathname.startsWith("/boards") ||
    url.pathname.startsWith("/profile");

  // Already authenticated users should not remain on login/register pages.
  if (isAuthPage && token) {
    const payload = await verifyAccessToken(token);

    if (payload) {
      return NextResponse.redirect(
        new URL("/dashboard", request.url)
      );
    }

    // Invalid access token: clear it but preserve the refresh cookie.
    const response = NextResponse.next();
    clearAccessCookie(response);

    return response;
  }

  if (isProtectedPage) {
    const payload = token
      ? await verifyAccessToken(token)
      : null;

    if (payload) {
      return NextResponse.next();
    }

    // Preserve the requested local path.
    const next = safeNextPath(
      `${url.pathname}${url.search}`
    );

    // Missing or invalid access token, but refresh token exists.
    if (refreshToken) {
      const refreshUrl = new URL(
        "/api/auth/refresh",
        request.url
      );

      refreshUrl.searchParams.set("next", next);

      return NextResponse.redirect(refreshUrl);
    }

    // Neither usable access credentials nor a refresh token exists.
    return loginRedirect(request, next, false);


  }

  return NextResponse.next();
}