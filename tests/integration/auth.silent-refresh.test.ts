import { describe, expect, it } from "vitest";
import { prisma } from "@/lib/prisma";
import { hashToken } from "@/lib/token";
import { setupCleanDb } from "../setup";
import {
  BASE_URL,
  api,
  cookieExpiresMs,
  cookieValue,
  isCleared,
  loginViaApi,
  rawCookie,
  setCookies,
} from "../helpers/http";
import { authCookie, createUser } from "../helpers/users";

setupCleanDb();

const locationOf = (res: { headers: Record<string, string> }) =>
  new URL(res.headers.location, BASE_URL);

const postRefresh = (token?: string) => {
  const req = api.post("/api/auth/refresh");
  return token ? req.set("Cookie", [`refreshToken=${token}`]) : req;
};

// The browser deletes the accessToken cookie once Max-Age (1h) passes, so an expired
// session looks like "refreshToken cookie only". These tests simulate exactly that.
describe("page navigation with an expired session (proxy.ts)", () => {
  it("no cookies at all -> redirect to /login", async () => {
    const res = await api.get("/dashboard").redirects(0);

    expect([302, 307]).toContain(res.status);
    expect(locationOf(res).pathname).toBe("/login");
  });

  it("only a refreshToken cookie -> redirect to the refresh route, not /login", async () => {
    const user = await createUser();
    const { refreshToken } = await loginViaApi(user);

    const res = await api
      .get("/dashboard")
      .set("Cookie", [`refreshToken=${refreshToken}`])
      .redirects(0);

    const loc = locationOf(res);
    expect([302, 307]).toContain(res.status);
    expect(loc.pathname).toBe("/api/auth/refresh");
    expect(loc.searchParams.get("next")).toBe("/dashboard");
  });

  it("deep link with no cookies -> /login?next=<path>, and nothing is cleared", async () => {
    const res = await api.get("/boards/abc-123").redirects(0);
    const loc = locationOf(res);

    expect(loc.pathname).toBe("/login");
    expect(loc.searchParams.get("next")).toBe("/boards/abc-123");
    expect(setCookies(res)).toHaveLength(0);
  });

  it("garbage access token + refresh cookie -> refresh route, preserving the path", async () => {
    const user = await createUser();
    const { refreshToken } = await loginViaApi(user);

    const res = await api
      .get("/boards/abc-123")
      .set("Cookie", ["accessToken=garbage", `refreshToken=${refreshToken}`])
      .redirects(0);

    const loc = locationOf(res);
    expect(loc.pathname).toBe("/api/auth/refresh");
    expect(loc.searchParams.get("next")).toBe("/boards/abc-123");
  });

  it("signed-in user visiting /login is sent to /dashboard", async () => {
    const user = await createUser();
    const res = await api.get("/login").set("Cookie", await authCookie(user)).redirects(0);

    expect(locationOf(res).pathname).toBe("/dashboard");
  });

  it("invalid access token on /login: page loads and only the access cookie is cleared", { timeout: 30_000 }, async () => {
    const res = await api.get("/login").set("Cookie", ["accessToken=garbage", "refreshToken=x"]).redirects(0);

    expect(res.status).toBe(200);
    expect(isCleared(rawCookie(res, "accessToken"))).toBe(true);
    expect(rawCookie(res, "refreshToken")).toBeUndefined();
  });
});

// JSON flavour of the refresh route, for fetch.ts to call after a 401.
describe("POST /api/auth/refresh (silent refresh for API calls)", () => {
  it("rotates tokens and returns 200 with fresh cookies", async () => {
    const user = await createUser();
    const { refreshToken: oldToken } = await loginViaApi(user);

    const res = await postRefresh(oldToken);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(cookieValue(res, "accessToken")).toBeTruthy();

    const newToken = cookieValue(res, "refreshToken")!;
    expect(newToken).not.toBe(oldToken);

    const rows = await prisma.refreshToken.findMany({ where: { userID: user.id } });
    const active = rows.filter((r) => !r.consumedAt);
    expect(active).toHaveLength(1);
    expect(active[0].tokenHash).toBe(hashToken(newToken));
    expect(rows.find((r) => r.tokenHash === hashToken(oldToken))?.consumedAt).toBeInstanceOf(Date);
  });

  it("the new access token works on a protected API route", async () => {
    const user = await createUser();
    const { refreshToken } = await loginViaApi(user);

    const res = await postRefresh(refreshToken);
    const profile = await api
      .get("/api/profile")
      .set("Cookie", [`accessToken=${cookieValue(res, "accessToken")}`]);

    expect(profile.status).toBe(200);
    expect(profile.body.data.username).toBe(user.username);
  });

  it("keeps the original deadline across rotations (absolute session cap)", async () => {
    const user = await createUser();
    const { refreshToken } = await loginViaApi(user);
    const deadline = new Date(Date.now() + 24 * 60 * 60 * 1000); // pretend the session is 6 days old
    await prisma.refreshToken.updateMany({ where: { userID: user.id }, data: { expiresAt: deadline } });

    const res = await postRefresh(refreshToken);

    expect(res.status).toBe(200);
    const active = await prisma.refreshToken.findFirstOrThrow({ where: { userID: user.id, consumedAt: null } });
    expect(active.expiresAt.getTime()).toBe(deadline.getTime());
    expect(Math.abs(cookieExpiresMs(rawCookie(res, "refreshToken"))! - deadline.getTime())).toBeLessThan(1000);
  });

  it("reuse inside the grace window returns 409, touches no cookies, and the new token still works", async () => {
    const user = await createUser();
    const { refreshToken: oldToken } = await loginViaApi(user);
    const first = await postRefresh(oldToken);

    const reuse = await postRefresh(oldToken);

    expect(reuse.status).toBe(409);
    expect(setCookies(reuse)).toHaveLength(0);
    expect((await postRefresh(cookieValue(first, "refreshToken")!)).status).toBe(200);
  });

  it("reuse after the grace window returns 401, clears cookies and revokes every session", async () => {
    const user = await createUser();
    const { refreshToken: oldToken } = await loginViaApi(user);
    const first = await postRefresh(oldToken);
    await prisma.refreshToken.updateMany({
      where: { tokenHash: hashToken(oldToken) },
      data: { consumedAt: new Date(Date.now() - 11_000) },
    });

    const reuse = await postRefresh(oldToken);

    expect(reuse.status).toBe(401);
    expect(isCleared(rawCookie(reuse, "refreshToken"))).toBe(true);
    expect(await prisma.refreshToken.count({ where: { userID: user.id } })).toBe(0);
    // the legitimately rotated token died with the session
    expect((await postRefresh(cookieValue(first, "refreshToken")!)).status).toBe(401);
  });

  it("401 without a refresh cookie", async () => {
    const res = await postRefresh();
    expect(res.status).toBe(401);
  });

  it("401 for an unknown refresh token", async () => {
    const res = await postRefresh("0".repeat(64));
    expect(res.status).toBe(401);
  });

  it("401 for an expired refresh token", async () => {
    const user = await createUser();
    const { refreshToken } = await loginViaApi(user);
    await prisma.refreshToken.updateMany({
      where: { userID: user.id },
      data: { expiresAt: new Date(Date.now() - 1000) },
    });

    const res = await postRefresh(refreshToken);
    expect(res.status).toBe(401);
  });

  it("a failed refresh clears the stale cookies", async () => {
    const res = await postRefresh("0".repeat(64));

    expect(res.status).toBe(401);
    expect(isCleared(rawCookie(res, "refreshToken"))).toBe(true);
    expect(isCleared(rawCookie(res, "accessToken"))).toBe(true);
  });

  it("simultaneous refreshes with one token: exactly one 200, the rest 409 with no cookies, never 500", async () => {
    const user = await createUser();
    const { refreshToken } = await loginViaApi(user);

    const results = await Promise.all(Array.from({ length: 4 }, () => postRefresh(refreshToken)));

    expect(results.map((r) => r.status).sort((a, b) => a - b)).toEqual([200, 409, 409, 409]);
    expect(results.filter((r) => r.status === 409).every((r) => setCookies(r).length === 0)).toBe(true);
    expect(await prisma.refreshToken.count({ where: { userID: user.id, consumedAt: null } })).toBe(1);
  });
});