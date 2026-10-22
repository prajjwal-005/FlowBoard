import { afterAll, beforeEach } from "vitest";
import { prisma } from "@/lib/prisma";
import { redis } from "@/lib/redis";
import { assertSafeTestEnv } from "./helpers/guard";

// Prisma table names (@@map) — RefreshToken and Notification have no @@map.
const TABLES = [
  "users",
  "RefreshToken",
  "boards",
  "board_members",
  "columns",
  "tasks",
  "task_assignees",
  "subtasks",
  "comments",
  "activity_logs",
  "Notification",
];

/**
 * Call once at the top of an integration test file.
 * Opt-in so pure unit tests don't pay for a DB round-trip per test.
 */
export function setupCleanDb() {
  beforeEach(async () => {
    assertSafeTestEnv();
    await prisma.$executeRawUnsafe(
      `TRUNCATE TABLE ${TABLES.map((t) => `"${t}"`).join(", ")} CASCADE`
    );
    await redis.flushdb(); // clears login/register rate-limit counters
  });

  afterAll(async () => {
    await prisma.$disconnect();
    await redis.quit();
  });
}
