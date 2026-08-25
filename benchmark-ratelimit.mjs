#!/usr/bin/env node
// Confirms the rate limiter allows exactly `limit` requests under concurrent load
// (no race-condition bypass) and reports the status-code breakdown.
//
// Usage: node benchmark-ratelimit.mjs <url> <concurrency>
// Example: node benchmark-ratelimit.mjs http://localhost:3000/api/auth/login 20

const url = process.argv[2] ?? "http://localhost:3000/api/auth/login";
const concurrency = Number(process.argv[3] ?? 20);

const body = JSON.stringify({
  identifier: "ratelimit-bench-user",
  password: "wrong-password-on-purpose",
});

async function fire(i) {
  const start = performance.now();
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
    });
    return { i, status: res.status, ms: performance.now() - start };
  } catch (e) {
    return { i, status: "ERR", ms: performance.now() - start, error: e.message };
  }
}

const results = await Promise.all(
  Array.from({ length: concurrency }, (_, i) => fire(i))
);

const counts = results.reduce((acc, r) => {
  acc[r.status] = (acc[r.status] ?? 0) + 1;
  return acc;
}, {});

const allowed = results.filter((r) => r.status !== 429).length;
console.log(results.filter(r => r.status === "ERR").map(r => r.error));
console.log(`Fired ${concurrency} concurrent requests to ${url}`);
console.log("Status breakdown:", counts);
console.log(`Allowed through: ${allowed}  (should equal your configured limit exactly)`);
console.log(`Rate-limited (429): ${counts[429] ?? 0}  (should equal concurrency - limit)`);
