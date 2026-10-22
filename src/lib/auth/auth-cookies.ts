import { NextResponse } from "next/server";

const cookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "strict" as const,
  path: "/",
};

export function setAuthCookies(
  response: NextResponse,
  tokens: { accessToken: string; refreshToken: string; refreshExpiresAt?: Date }
) {
  response.cookies.set("accessToken", tokens.accessToken, {
    ...cookieOptions,
    maxAge: 60 * 60,
  });
  response.cookies.set("refreshToken", tokens.refreshToken, {
    ...cookieOptions,
    ...(tokens.refreshExpiresAt
      ? { expires: tokens.refreshExpiresAt }
      : { maxAge: 7 * 24 * 60 * 60 }),
  });
}

export function clearAccessCookie(response: NextResponse) {
  response.cookies.delete("accessToken");
}

export function clearAuthCookies(response: NextResponse) {
  response.cookies.delete("accessToken");
  response.cookies.delete("refreshToken");
}