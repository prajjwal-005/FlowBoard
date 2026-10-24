import fs from "node:fs";
import path from "node:path";
import dotenv from "dotenv";

// user + host + db name (+ redis db index). Same fingerprint as .env => same database.
// Username is included because hosted Prisma Postgres instances share host and db
// name ("postgres") and differ only by credentials. Password is never compared/logged.
function fingerprint(url: string) {
  const u = new URL(url);
  return `${u.username}@${u.host}${u.pathname}`;
}

function readDevEnv(): Record<string, string> {
  const p = path.resolve(process.cwd(), ".env");
  return fs.existsSync(p) ? dotenv.parse(fs.readFileSync(p)) : {};
}

/** Throws unless it is safe to TRUNCATE the DB and FLUSHDB Redis. */
export function assertSafeTestEnv() {
  const { DATABASE_URL, REDIS_URL, ALLOW_DB_RESET } = process.env;

  if (!DATABASE_URL || !REDIS_URL) {
    throw new Error("Test env not loaded: DATABASE_URL / REDIS_URL missing (check .env.test)");
  }
  if (ALLOW_DB_RESET !== "true") {
    throw new Error("Refusing to reset: set ALLOW_DB_RESET=true in .env.test");
  }

  const dev = readDevEnv(); // empty in CI where .env doesn't exist
  
  if (dev.DATABASE_URL && fingerprint(dev.DATABASE_URL) === fingerprint(DATABASE_URL)) {
    throw new Error("Refusing to reset: .env.test DATABASE_URL points at the same DB as .env");
  }
  if (dev.REDIS_URL && fingerprint(dev.REDIS_URL) === fingerprint(REDIS_URL)) {
    throw new Error("Refusing to reset: .env.test REDIS_URL is the same Redis db as .env");
  }
  if (process.env.CI === "true") {
  for (const url of [DATABASE_URL, REDIS_URL]) {
    const host = new URL(url).hostname;
    if (host !== "localhost" && host !== "127.0.0.1") {
      throw new Error("Refusing to reset: in CI the test DB/Redis must be local");
    }
  }
}
}
