import { failure, success } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { checkRateLimit } from "@/lib/ratelimit";
import { generateAccessToken, generateRefreshToken, hashToken } from "@/lib/token";
import { registerSchema } from "@/schemas/registerSchema";
import { PrismaClientKnownRequestError } from "@prisma/client/runtime/client";
import bcrypt from "bcryptjs";
import { NextRequest } from "next/server";
import { setAuthCookies } from "@/lib/auth/auth-cookies";
import { BCRYPT_ROUNDS, REFRESH_TOKEN_TTL_MS } from "@/lib/auth/constants";

export async function POST(request: NextRequest) {
  try {
    const ip = request.headers.get("x-forwarded-for")?.split(",")[0].trim() ?? "unknown";
    const { allowed, remaining, resetAt } = await checkRateLimit(
      `ratelimit:register:${ip}`,
      5,
      60
    );
    if (!allowed) {
      return failure("Too many Register attempts. Try again later.", 429);
    }

    const body = await request.json().catch(() => null);
    const parsed = registerSchema.safeParse(body);
    if (!parsed.success) {
      return failure("Invalid input", 400);
    }

    const user = parsed.data;

    if (await prisma.user.findUnique({ where: { username: user.username } })) {
      return failure("Username already exists", 409);
    }
    if (await prisma.user.findUnique({ where: { email: user.email } })) {
      return failure("Email already exists", 409);
    }

    const passwordHash = await bcrypt.hash(user.password, BCRYPT_ROUNDS);
    const newUser = await prisma.user.create({
      data: { username: user.username, email: user.email, passwordHash },
    });

    const accessToken = await generateAccessToken({
      userID: newUser.id,
      email: newUser.email,
      username: newUser.username,
    });
    const refreshToken = generateRefreshToken();
    const refreshExpiresAt = new Date(Date.now() + REFRESH_TOKEN_TTL_MS);

    await prisma.refreshToken.create({
      data: {
        tokenHash: hashToken(refreshToken),
        userID: newUser.id,
        expiresAt: refreshExpiresAt,
      },
    });

    const response = success(
      { id: newUser.id, username: newUser.username, email: newUser.email },
      "User registered successfully",
      201
    );
    setAuthCookies(response, { accessToken, refreshToken, refreshExpiresAt });
    return response;
  } catch (error) {
    if (error instanceof PrismaClientKnownRequestError && error.code === "P2002") {
      // Lost a race between the checks above and the insert.
      return failure("Username or email already in use", 409);
    }
    console.error("Error registering user", error);
    return failure("Error registering user", 500);
  }
}