import { prisma } from "@/lib/prisma";
import {
  AccessTokenPayload,
  generateAccessToken,
  generateRefreshToken,
  hashToken,
} from "@/lib/token";

// A just-rotated token stays recognisable for a few seconds so requests that
// were already in flight with it aren't mistaken for an invalid or stolen token.
const ROTATION_GRACE_MS = 10_000;

export type RotationResult =
  | {
      status: "ok";
      accessToken: string;
      refreshToken: string;
      refreshExpiresAt: Date;
    }
  | { status: "raced" } // a parallel request rotated it; keep cookies, retry
  | { status: "invalid" }; // unknown, expired, replayed or orphaned; clear cookies

export async function rotateRefreshSession(
  rawRefreshToken: string
): Promise<RotationResult> {
  const tokenHash = hashToken(rawRefreshToken);
  const now = new Date();

  const record = await prisma.refreshToken.findUnique({
    where: { tokenHash },
  });

  if (!record) return { status: "invalid" };

  if (record.expiresAt <= now) {
    // All rows in a session chain share one expiry, so clear them together.
    await prisma.refreshToken.deleteMany({
      where: { userID: record.userID, expiresAt: { lte: now } },
    });
    return { status: "invalid" };
  }

  if (record.consumedAt) {
    // Inside the grace window this is a parallel request, and the winner's
    // response is carrying the new cookies.
    if (now.getTime() - record.consumedAt.getTime() <= ROTATION_GRACE_MS) {
      return { status: "raced" };
    }
    // Replayed after the grace window: treat as reuse and end the session.
    await prisma.refreshToken.deleteMany({
      where: { userID: record.userID },
    });
    return { status: "invalid" };
  }

  const user = await prisma.user.findUnique({
    where: { id: record.userID },
  });

  if (!user) {
    await prisma.refreshToken.deleteMany({
      where: { userID: record.userID },
    });
    return { status: "invalid" };
  }

  const newRefreshToken = generateRefreshToken();
  const newRefreshTokenHash = hashToken(newRefreshToken);

  const payload: AccessTokenPayload = {
    userID: user.id,
    email: user.email,
    username: user.username,
  };
  const newAccessToken = await generateAccessToken(payload);

  const rotated = await prisma.$transaction(async (tx) => {
    // Atomic claim: only one request can flip consumedAt from null.
    const claimed = await tx.refreshToken.updateMany({
      where: {
        id: record.id,
        consumedAt: null,
        expiresAt: { gt: new Date() },
      },
      data: { consumedAt: new Date() },
    });

    if (claimed.count !== 1) return false;

    await tx.refreshToken.create({
      data: {
        tokenHash: newRefreshTokenHash,
        userID: user.id,
        expiresAt: record.expiresAt, // keep the original deadline
      },
    });
    // Keep at most the current row plus any still inside the grace window.
    await tx.refreshToken.deleteMany({
    where: {
        userID: user.id,
        consumedAt: { lt: new Date(Date.now() - ROTATION_GRACE_MS) },
    },
    });

    return true;
  });

  if (!rotated) return { status: "raced" };

  return {
    status: "ok",
    accessToken: newAccessToken,
    refreshToken: newRefreshToken,
    refreshExpiresAt: record.expiresAt,
  };
}