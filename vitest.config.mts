import { defineConfig } from "vitest/config";
import dotenv from "dotenv";
import path from "node:path";

// Load .env.test here so every worker gets it via `test.env`
// (prisma.ts / token.ts / redis.ts read process.env at import time).
const { parsed = {} } = dotenv.config({
  path: path.resolve(process.cwd(), ".env.test"),
  override: true,
  quiet: true,
});

export default defineConfig({
  resolve: {
    alias: { "@": path.resolve(process.cwd(), "src") },
  },
  test: {
    env: parsed,
    globalSetup: ["./tests/global-setup.ts"],
    fileParallelism: false, // test files share one DB + one Redis -> run serially
    testTimeout: 15_000, // hosted DB has occasional latency spikes
    hookTimeout: 30_000,
  },
});
