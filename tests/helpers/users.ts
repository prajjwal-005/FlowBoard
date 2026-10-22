import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { generateAccessToken } from "@/lib/token";

export type TestUser = {
  id: string;
  username: string;
  email: string;
  password: string;
};

let counter = 0;

/** Inserts a user directly via Prisma (no API call, so no rate limit). */
export async function createUser(
  overrides: Partial<Pick<TestUser, "username" | "email" | "password">> = {}
): Promise<TestUser> {
  const n = ++counter;
  const username = overrides.username ?? `user_${n}`;
  const email = overrides.email ?? `${username}@test.com`;
  const password = overrides.password ?? "Password123!";

  const user = await prisma.user.create({
    data: {
      username,
      email,
      passwordHash: await bcrypt.hash(password, 4), // low cost = fast tests
    },
  });

  return { id: user.id, username, email, password };
}

/**
 * Signs a valid accessToken directly (same secret as the server) and returns it
 * in supertest's `.set("Cookie", ...)` format. Use this for RBAC/CRUD tests;
 * use the real POST /api/login only in the auth suite.
 */
export async function authCookie(user: Pick<TestUser, "id" | "email" | "username">) {
  const token = await generateAccessToken({
    userID: user.id,
    email: user.email,
    username: user.username,
  });
  return [`accessToken=${token}`];
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