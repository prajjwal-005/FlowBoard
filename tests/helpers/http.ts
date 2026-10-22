import request from "supertest";
import type { TestUser } from "./users";

type Res = request.Response;

export const BASE_URL = "http://127.0.0.1:3000"; // 127.0.0.1, not localhost (IPv6 on Windows)
export const api = request(BASE_URL);

/** All Set-Cookie header lines of a response. */
export function setCookies(res: Res): string[] {
  return (res.headers["set-cookie"] as unknown as string[] | undefined) ?? [];
}

/** The full Set-Cookie line for one cookie, e.g. "accessToken=...; Max-Age=3600; HttpOnly" */
export function rawCookie(res: Res, name: string): string | undefined {
  return setCookies(res).find((c) => c.startsWith(`${name}=`));
}

/** Just the value of one cookie. */
export function cookieValue(res: Res, name: string): string | undefined {
  const raw = rawCookie(res, name);
  return raw ? raw.split(";")[0].slice(name.length + 1) : undefined;
}

/** Real login through the API. Returns both tokens parsed from Set-Cookie. */
export async function loginViaApi(
  user: Pick<TestUser, "username" | "password">,
  ip = "198.51.100.1" // login is rate limited per x-forwarded-for
) {
  const res = await api
    .post("/api/login")
    .set("X-Forwarded-For", ip)
    .send({ identifier: user.username, password: user.password });

  return {
    res,
    accessToken: cookieValue(res, "accessToken")!,
    refreshToken: cookieValue(res, "refreshToken")!,
  };
}

/** Expires attribute of a Set-Cookie line, as epoch ms. */
export function cookieExpiresMs(raw?: string): number | undefined {
  const m = raw?.match(/expires=([^;]+)/i);
  return m ? Date.parse(m[1]) : undefined;
}

/** True when the Set-Cookie line deletes the cookie (Max-Age=0 or an Expires in the past). */
export function isCleared(raw?: string): boolean {
  if (!raw) return false;
  return /max-age=0/i.test(raw) || (cookieExpiresMs(raw) ?? Infinity) <= Date.now();
}