import { Redis } from "ioredis";

const globalForRedis = global as unknown as { redis?: Redis };

if (!process.env.REDIS_URL) throw new Error("REDIS_URL is not set");

export const redis =
  globalForRedis.redis ?? new Redis(process.env.REDIS_URL);

redis.on("error", (err) => console.error("Redis error:", err));

if (process.env.NODE_ENV !== "production") globalForRedis.redis = redis;