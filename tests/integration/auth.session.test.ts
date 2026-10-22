import { describe, expect, it } from "vitest";
import { SignJWT } from "jose";
import { prisma } from "@/lib/prisma";
import { hashToken } from "@/lib/token";
import { setupCleanDb } from "../setup";
import {
  BASE_URL,
  api,
  cookieValue,
  isCleared,
  loginViaApi,
  rawCookie,
  setCookies,
} from "../helpers/http";
import { authCookie, createUser } from "../helpers/users";

const secret = new TextEncoder().encode(process.env.JWT_SECRET!);

function sign(
  payload: Record<string, unknown>,
  { key = secret, exp = "1h" as string | number } = {}
) {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(exp)
    .sign(key);
}

const refreshWith = (token: string, next?: string) =>
  api
    .get(`/api/auth/refresh${next ? `?next=${encodeURIComponent(next)}` : ""}`)
    .set("Cookie", [`refreshToken=${token}`])
    .redirects(0);

// Once per FILE (not per describe): its afterAll closes Prisma + Redis.
setupCleanDb();

describe("protected routes (access token)", () => {
  it.each(["/api/profile", "/api/boards"])("%s without a cookie -> 401", async (path) => {
    const res = await api.get(path);
    expect(res.status).toBe(401);
  });

  it("rejects a garbage token", async () => {
    const res = await api.get("/api/profile").set("Cookie", ["accessToken=not.a.jwt"]);
    expect(res.status).toBe(401);
  });

  it("rejects an expired token", async () => {
    const user = await createUser();
    const token = await sign(
      { userID: user.id, email: user.email, username: user.username },
      { exp: Math.floor(Date.now() / 1000) - 3600 }
    );
    const res = await api.get("/api/profile").set("Cookie", [`accessToken=${token}`]);
    expect(res.status).toBe(401);
  });

  it("rejects a token signed with the wrong secret", async () => {
    const user = await createUser();
    const token = await sign(
      { userID: user.id, email: user.email, username: user.username },
      { key: new TextEncoder().encode("some-other-secret") }
    );
    const res = await api.get("/api/profile").set("Cookie", [`accessToken=${token}`]);
    expect(res.status).toBe(401);
  });

  it("rejects a correctly signed token with a missing claim (old-format token)", async () => {
    const user = await createUser();
    const token = await sign({ userID: user.id, email: user.email }); // no username
    const res = await api.get("/api/profile").set("Cookie", [`accessToken=${token}`]);
    expect(res.status).toBe(401);
  });

  it("accepts a valid token", async () => {
    const user = await createUser();
    const res = await api.get("/api/profile").set("Cookie", await authCookie(user));

    expect(res.status).toBe(200);
    expect(res.body.data.username).toBe(user.username);
  });
});

describe("DELETE /api/logout", () => {
  it("deletes the refresh token row and clears both cookies", async () => {
    const user = await createUser();
    const { accessToken, refreshToken } = await loginViaApi(user);

    const res = await api
      .delete("/api/logout")
      .set("Cookie", [`accessToken=${accessToken}`, `refreshToken=${refreshToken}`]);

    expect(res.status).toBe(200);
    expect(isCleared(rawCookie(res, "accessToken"))).toBe(true);
    expect(isCleared(rawCookie(res, "refreshToken"))).toBe(true);
    expect(await prisma.refreshToken.count({ where: { userID: user.id } })).toBe(0);
  });

  it("succeeds silently without any cookies", async () => {
    const res = await api.delete("/api/logout");
    expect(res.status).toBe(200);
  });
});

describe("GET /api/auth/refresh", () => {
  it("rotates the refresh token and issues fresh cookies, redirecting to /dashboard", async () => {
    const user = await createUser();
    const { refreshToken: oldToken } = await loginViaApi(user);

    const res = await refreshWith(oldToken);

    expect([302, 307]).toContain(res.status);
    expect(new URL(res.headers.location, BASE_URL).pathname).toBe("/dashboard");
    expect(cookieValue(res, "accessToken")).toBeTruthy();

    const newToken = cookieValue(res, "refreshToken")!;
    expect(newToken).not.toBe(oldToken);

    const rows = await prisma.refreshToken.findMany({ where: { userID: user.id } });
    const active = rows.filter((r) => !r.consumedAt);
    expect(active).toHaveLength(1);
    expect(active[0].tokenHash).toBe(hashToken(newToken));
    expect(rows.find((r) => r.tokenHash === hashToken(oldToken))?.consumedAt).toBeInstanceOf(Date);
  });

  it("reuse inside the grace window is a lost race: retried, no cookies touched, session intact", async () => {
    const user = await createUser();
    const { refreshToken: oldToken } = await loginViaApi(user);
    const rotated = await refreshWith(oldToken);

    const reuse = await refreshWith(oldToken);

    const loc = new URL(reuse.headers.location, BASE_URL);
    expect(loc.pathname).toBe("/api/auth/refresh");
    expect(loc.searchParams.get("attempt")).toBe("1");
    expect(setCookies(reuse)).toHaveLength(0);
    // the winner's new token still works
    const again = await refreshWith(cookieValue(rotated, "refreshToken")!);
    expect(cookieValue(again, "accessToken")).toBeTruthy();
  });

  it("reuse after the grace window is treated as theft: login redirect, cookies cleared, all sessions revoked", async () => {
    const user = await createUser();
    const { refreshToken: oldToken } = await loginViaApi(user);
    await refreshWith(oldToken);
    await prisma.refreshToken.updateMany({
      where: { tokenHash: hashToken(oldToken) },
      data: { consumedAt: new Date(Date.now() - 11_000) },
    });

    const reuse = await refreshWith(oldToken);

    expect(new URL(reuse.headers.location, BASE_URL).pathname).toBe("/login");
    expect(isCleared(rawCookie(reuse, "refreshToken"))).toBe(true);
    expect(await prisma.refreshToken.count({ where: { userID: user.id } })).toBe(0);
  });

  it("after 2 retries a lost race goes to /login WITHOUT clearing cookies", async () => {
    const user = await createUser();
    const { refreshToken } = await loginViaApi(user);
    await refreshWith(refreshToken); // consumes it

    const res = await api
      .get("/api/auth/refresh?attempt=2")
      .set("Cookie", [`refreshToken=${refreshToken}`])
      .redirects(0);

    expect(new URL(res.headers.location, BASE_URL).pathname).toBe("/login");
    expect(setCookies(res)).toHaveLength(0);
  });

  it("rejects an expired refresh token: login redirect and cleared cookies", async () => {
    const user = await createUser();
    const { refreshToken } = await loginViaApi(user);
    await prisma.refreshToken.updateMany({
      where: { userID: user.id },
      data: { expiresAt: new Date(Date.now() - 1000) },
    });

    const res = await refreshWith(refreshToken);

    expect(new URL(res.headers.location, BASE_URL).pathname).toBe("/login");
    expect(isCleared(rawCookie(res, "refreshToken"))).toBe(true);
  });

  it("honours a safe ?next path", async () => {
    const user = await createUser();
    const { refreshToken } = await loginViaApi(user);

    const res = await refreshWith(refreshToken, "/boards");

    expect(new URL(res.headers.location, BASE_URL).pathname).toBe("/boards");
  });

  it.each([
    ["absolute URL", "https://evil.com"],
    ["protocol-relative URL", "//evil"],
    ["triple slash", "///evil"],
    ["backslash trick", "/\\evil"],
  ])("never redirects off-site via ?next (%s)", async (_label, next) => {
    const user = await createUser();
    const { refreshToken } = await loginViaApi(user);

    const res = await refreshWith(refreshToken, next);

    // The server may build the Location from "localhost" or "127.0.0.1"; both are us.
    const host = new URL(res.headers.location, BASE_URL).host;
    expect(["127.0.0.1:3000", "localhost:3000"]).toContain(host);
  });
});