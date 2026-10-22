import { NextRequest, NextResponse } from "next/server";
import { failure } from "@/lib/api";
import { safeNextPath } from "@/lib/safe-next-path";
import { rotateRefreshSession } from "@/lib/auth/refresh-session";
import { clearAuthCookies, setAuthCookies } from "@/lib/auth/auth-cookies";
import { loginRedirect } from "@/lib/auth/login-redirect";

const MAX_RACE_RETRIES = 2;
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function unauthorizedResponse() {
  const response = NextResponse.json(
    { error: "Invalid or expired session" },
    { status: 401 }
  );
  clearAuthCookies(response);
  return response;
}

// Deliberately sets no cookies: the winning request's response carries them.
function refreshInProgressResponse() {
  return NextResponse.json(
    { error: "Session refresh in progress" },
    { status: 409 }
  );
}

export async function GET(request: NextRequest) {
  try {
    const params = request.nextUrl.searchParams;
    const next = safeNextPath(params.get("next"));
    const refreshToken = request.cookies.get("refreshToken")?.value;

    // Nothing was sent, so there is nothing to clear.
    if (!refreshToken) return loginRedirect(request, next, false);

    const result = await rotateRefreshSession(refreshToken);
    if (result.status === "invalid") return loginRedirect(request, next);

    if (result.status === "raced") {
      const attempt = Math.max(0, Number(params.get("attempt")) || 0);
      // Out of retries: go to login but leave the cookies alone.
      if (attempt >= MAX_RACE_RETRIES) return loginRedirect(request, next, false);

      await sleep(150 * (attempt + 1)); // let the winner's Set-Cookie land
      const retryUrl = new URL("/api/auth/refresh", request.url);
      retryUrl.searchParams.set("next", next);
      retryUrl.searchParams.set("attempt", String(attempt + 1));
      return NextResponse.redirect(retryUrl);
    }

    const response = NextResponse.redirect(new URL(next, request.url));
    setAuthCookies(response, result);
    return response;
  } catch (error) {
    return failure("Error refreshing session", 500, error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const refreshToken = request.cookies.get("refreshToken")?.value;
    if (!refreshToken) return unauthorizedResponse();

    const result = await rotateRefreshSession(refreshToken);
    if (result.status === "invalid") return unauthorizedResponse();
    if (result.status === "raced") return refreshInProgressResponse();

    const response = NextResponse.json({ success: true }, { status: 200 });
    setAuthCookies(response, result);
    return response;
  } catch (error) {
    return failure("Error refreshing session", 500, error);
  }
}