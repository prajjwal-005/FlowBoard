import { NextRequest, NextResponse } from "next/server";
import { clearAuthCookies } from "./auth-cookies";

export function loginRedirect(request: NextRequest, next?: string, clearCookies = true) {
  const url = new URL("/login", request.url);
  if (next && next !== "/dashboard") url.searchParams.set("next", next);
  const response = NextResponse.redirect(url);
  if (clearCookies) clearAuthCookies(response);
  return response;
}