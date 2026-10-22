import { describe, expect, it } from "vitest";
import { prisma } from "@/lib/prisma";
import { hashToken, verifyAccessToken } from "@/lib/token";
import { setupCleanDb } from "../setup";
import { createUser } from "../helpers/users";
import { api, cookieExpiresMs, cookieValue, loginViaApi, rawCookie, setCookies } from "../helpers/http";
describe("POST /api/login", () => {
  setupCleanDb();

  it("logs in with username", async () => {
    const user = await createUser();
    const { res } = await loginViaApi(user);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it("logs in with email", async () => {
    const user = await createUser();
    const res = await api.post("/api/login").send({ identifier: user.email, password: user.password });

    expect(res.status).toBe(200);
  });

  it("treats the identifier as case-insensitive", async () => {
    const user = await createUser({ username: "bob_1" });
    const res = await api.post("/api/login").send({ identifier: "BOB_1", password: user.password });

    expect(res.status).toBe(200);
  });


  it("sets httpOnly, SameSite=Strict cookies: access lasts 1h, refresh expires with its DB row (7d)", async () => {
    const user = await createUser();
    const { res } = await loginViaApi(user);
    const access = rawCookie(res, "accessToken")!;
    const refresh = rawCookie(res, "refreshToken")!;

    for (const c of [access, refresh]) {
      expect(c).toMatch(/httponly/i);
      expect(c).toMatch(/samesite=strict/i);
      expect(c).toMatch(/path=\//i);
    }
    expect(access).toMatch(/max-age=3600/i);

    const row = await prisma.refreshToken.findFirstOrThrow({ where: { userID: user.id } });
    const sevenDays = 7 * 24 * 60 * 60 * 1000;
    expect(Math.abs(row.expiresAt.getTime() - (Date.now() + sevenDays))).toBeLessThan(60_000);
    expect(Math.abs(cookieExpiresMs(refresh)! - row.expiresAt.getTime())).toBeLessThan(1000);
  });

  it("issues an access token carrying userID, email and username", async () => {
    const user = await createUser();
    const { accessToken } = await loginViaApi(user);

    const payload = await verifyAccessToken(accessToken);
    expect(payload).toEqual({ userID: user.id, email: user.email, username: user.username });
  });

  it("stores only the SHA-256 hash of the refresh token, never the raw value", async () => {
    const user = await createUser();
    const { refreshToken } = await loginViaApi(user);

    const rows = await prisma.refreshToken.findMany({ where: { userID: user.id } });
    expect(rows).toHaveLength(1);
    expect(rows[0].tokenHash).toBe(hashToken(refreshToken));
    expect(rows[0].tokenHash).not.toBe(refreshToken);
  });

  it("enforces a single session: a new login invalidates the previous refresh token", async () => {
    const user = await createUser();
    const first = await loginViaApi(user);
    const second = await loginViaApi(user);

    const rows = await prisma.refreshToken.findMany({ where: { userID: user.id } });
    expect(rows).toHaveLength(1);
    expect(rows[0].tokenHash).toBe(hashToken(second.refreshToken));
    expect(rows[0].tokenHash).not.toBe(hashToken(first.refreshToken));
  });

  it("rejects a wrong password with 401 and sets no cookies", async () => {
    const user = await createUser();
    const res = await api.post("/api/login").send({ identifier: user.username, password: "wrong-password" });

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
    expect(setCookies(res)).toHaveLength(0);
    expect(await prisma.refreshToken.count()).toBe(0);
  });

  it("does not reveal whether the account exists (same status and message)", async () => {
    const user = await createUser();
    const wrongPassword = await api.post("/api/login").send({ identifier: user.username, password: "nope-nope" });
    const unknownUser = await api.post("/api/login").send({ identifier: "ghost_user", password: "nope-nope" });

    expect(unknownUser.status).toBe(401);
    expect(unknownUser.status).toBe(wrongPassword.status);
    expect(unknownUser.body.message).toBe(wrongPassword.body.message);
  });

  it.each([
    ["missing password", { identifier: "alice_1" }],
    ["empty password", { identifier: "alice_1", password: "" }],
    ["malformed identifier", { identifier: "!!", password: "secret123" }],
    ["empty body", {}],
  ])("rejects invalid input: %s -> 400", async (_label, payload) => {
    const res = await api.post("/api/login").send(payload);

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it("returns the cookie value from the same login that created the DB row", async () => {
    // sanity: parsed cookie helpers agree with each other
    const user = await createUser();
    const { res, accessToken } = await loginViaApi(user);
    expect(cookieValue(res, "accessToken")).toBe(accessToken);
  });
});
