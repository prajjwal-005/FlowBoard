import { redis } from "./redis";
import crypto from "crypto";

const script = `
redis.call('ZREMRANGEBYSCORE', KEYS[1], 0, ARGV[2])
local count = redis.call('ZCARD', KEYS[1])
local allowed = 0

if count < tonumber(ARGV[3]) then
  redis.call('ZADD', KEYS[1], ARGV[1], ARGV[1] .. '-' .. ARGV[4])
  redis.call('EXPIRE', KEYS[1], ARGV[5])
  allowed = 1
  count = count + 1
end

local remaining = tonumber(ARGV[3]) - count
if remaining < 0 then remaining = 0 end

local resetAt = 0
local oldest = redis.call('ZRANGE', KEYS[1], 0, 0, 'WITHSCORES')
if oldest[2] then
  resetAt = tonumber(oldest[2]) + (tonumber(ARGV[5]) * 1000)
end

return {allowed, remaining, resetAt}
`;

export async function checkRateLimit(
  key: string,
  limit: number,
  windowSeconds: number
): Promise<{ allowed: boolean; remaining: number; resetAt: number }> {
  const now = Date.now();
  const windowStart = now - windowSeconds * 1000;
  const random_id = crypto.randomUUID();

  const result = (await redis.eval(
    script,
    1,
    key,
    now,
    windowStart,
    limit,
    random_id,
    windowSeconds
  )) as [number, number, number];

  return {
    allowed: result[0] === 1,
    remaining: result[1],
    resetAt: result[2],
  };
}