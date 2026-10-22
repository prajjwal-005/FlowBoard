import { describe, expect, it } from "vitest";
import { prisma } from "@/lib/prisma";
import { generateRefreshToken, hashToken } from "@/lib/token";
import { rotateRefreshSession } from "@/lib/auth/refresh-session";
import { setupCleanDb } from "../setup";
import { createUser } from "../helpers/users";

setupCleanDb();

const DAY = 24 * 60 * 60 * 1000;

async function seedSession(userID: string, expiresAt = new Date(Date.now() + 7 * DAY)) {
  const raw = generateRefreshToken();
  await prisma.refreshToken.create({ data: { tokenHash: hashToken(raw), userID, expiresAt } });
  return raw;
}

const backdateConsumed = (raw: string, ms: number) =>
  prisma.refreshToken.updateMany({
    where: { tokenHash: hashToken(raw) },
    data: { consumedAt: new Date(Date.now() - ms) },
  });

async function rotateOk(raw: string) {
  const r = await rotateRefreshSession(raw);
  if (r.status !== "ok") throw new Error(`expected ok, got ${r.status}`);
  return r;
}

describe("rotateRefreshSession", () => {
  it("unknown token -> invalid", async () => {
    expect((await rotateRefreshSession("0".repeat(64))).status).toBe("invalid");
  });

  it("rotates: new token, SAME expiresAt, old row consumed, new row active", async () => {
    const user = await createUser();
    const expiresAt = new Date(Date.now() + 2 * DAY);
    const raw = await seedSession(user.id, expiresAt);

    const r = await rotateOk(raw);

    expect(r.refreshToken).not.toBe(raw);
    expect(r.refreshExpiresAt.getTime()).toBe(expiresAt.getTime());
    const rows = await prisma.refreshToken.findMany({ where: { userID: user.id } });
    expect(rows).toHaveLength(2);
    expect(rows.find((x) => x.tokenHash === hashToken(raw))?.consumedAt).toBeInstanceOf(Date);
    const active = rows.find((x) => x.tokenHash === hashToken(r.refreshToken))!;
    expect(active.consumedAt).toBeNull();
    expect(active.expiresAt.getTime()).toBe(expiresAt.getTime());
  });

  it("reuse inside the grace window -> raced, and nothing is revoked", async () => {
    const user = await createUser();
    const raw = await seedSession(user.id);
    const r = await rotateOk(raw);

    expect((await rotateRefreshSession(raw)).status).toBe("raced");
    expect(await prisma.refreshToken.count({ where: { userID: user.id } })).toBe(2);
    expect((await rotateRefreshSession(r.refreshToken)).status).toBe("ok");
  });

  it("reuse after the grace window -> invalid, and every session of that user is revoked", async () => {
    const user = await createUser();
    const raw = await seedSession(user.id);
    await rotateOk(raw);
    await backdateConsumed(raw, 11_000);

    expect((await rotateRefreshSession(raw)).status).toBe("invalid");
    expect(await prisma.refreshToken.count({ where: { userID: user.id } })).toBe(0);
  });

  it("revocation is scoped to the user who replayed", async () => {
    const [a, b] = [await createUser(), await createUser()];
    const rawA = await seedSession(a.id);
    await seedSession(b.id);
    await rotateOk(rawA);
    await backdateConsumed(rawA, 11_000);

    await rotateRefreshSession(rawA);

    expect(await prisma.refreshToken.count({ where: { userID: a.id } })).toBe(0);
    expect(await prisma.refreshToken.count({ where: { userID: b.id } })).toBe(1);
  });

  it("expired token -> invalid, expired rows deleted", async () => {
    const user = await createUser();
    const raw = await seedSession(user.id, new Date(Date.now() - 1000));

    expect((await rotateRefreshSession(raw)).status).toBe("invalid");
    expect(await prisma.refreshToken.count({ where: { userID: user.id } })).toBe(0);
  });

  it("concurrent rotations of one token: exactly one ok, the rest raced", async () => {
    const user = await createUser();
    const raw = await seedSession(user.id);

    const results = await Promise.all(Array.from({ length: 5 }, () => rotateRefreshSession(raw)));

    expect(results.filter((r) => r.status === "ok")).toHaveLength(1);
    expect(results.filter((r) => r.status === "raced")).toHaveLength(4);
    expect(await prisma.refreshToken.count({ where: { userID: user.id, consumedAt: null } })).toBe(1);
  });

  it("prunes consumed rows older than the grace window on the next rotation", async () => {
    const user = await createUser();
    const t0 = await seedSession(user.id);
    const r1 = await rotateOk(t0);
    await backdateConsumed(t0, 20_000);

    const r2 = await rotateOk(r1.refreshToken);

    const hashes = (await prisma.refreshToken.findMany({ where: { userID: user.id } }))
      .map((r) => r.tokenHash)
      .sort();
    expect(hashes).toEqual([hashToken(r1.refreshToken), hashToken(r2.refreshToken)].sort());
  });
});