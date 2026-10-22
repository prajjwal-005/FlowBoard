import { failure, success } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { generateAccessToken, generateRefreshToken, hashToken } from "@/lib/token";
import bcrypt from "bcryptjs";
import { loginSchema } from "@/schemas/loginSchema";
import { checkRateLimit } from "@/lib/ratelimit";
import { setAuthCookies } from "@/lib/auth/auth-cookies";
import { DUMMY_PASSWORD_HASH, REFRESH_TOKEN_TTL_MS } from "@/lib/auth/constants";

export async function POST(request: Request) {
  try {
    const ip = request.headers.get("x-forwarded-for")?.split(",")[0].trim() ?? "unknown";
    const { allowed, remaining, resetAt } = await checkRateLimit(
      `ratelimit:login:${ip}`,
      5,
      60
    );
    if (!allowed) {
      return failure("Too many login attempts. Try again later.", 429);
    }

    const body = await request.json().catch(() => null);
    const parsed = loginSchema.safeParse(body);
    if (!parsed.success) {
      return failure("Invalid input", 400);
    }

    const { identifier, password } = parsed.data;
    const account = await prisma.user.findFirst({
      where: { OR: [{ username: identifier }, { email: identifier }] },
    });

    // Always run bcrypt, even when no account matched.
    const passwordOk = await bcrypt.compare(
      password,
      account?.passwordHash ?? DUMMY_PASSWORD_HASH
    );
    if (!account || !passwordOk) {
      return failure("Invalid credentials", 401);
    }

    const accessToken = await generateAccessToken({
      userID: account.id,
      email: account.email,
      username: account.username,
    });
    const refreshToken = generateRefreshToken();
    const refreshExpiresAt = new Date(Date.now() + REFRESH_TOKEN_TTL_MS);

    // Single session per user: a new login replaces any existing session.
    await prisma.$transaction([
      prisma.refreshToken.deleteMany({ where: { userID: account.id } }),
      prisma.refreshToken.create({
        data: {
          tokenHash: hashToken(refreshToken),
          userID: account.id,
          expiresAt: refreshExpiresAt,
        },
      }),
    ]);

    const response = success(
      { id: account.id, username: account.username, email: account.email },
      "User logged in successfully",
      200
    );
    setAuthCookies(response, { accessToken, refreshToken, refreshExpiresAt });
    return response;
  } catch (error) {
    console.error("Error logging user", error);
    return failure("Error logging user", 500);
  }
}