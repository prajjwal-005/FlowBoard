import { describe, expect, it } from "vitest";
import { setupCleanDb } from "../setup";
import { api } from "../helpers/http";
import { createUser } from "../helpers/users";

// The limiter keys on the first x-forwarded-for entry, so tests pick their own "IP".
const attemptLogin = (identifier: string, ip: string) =>
  api
    .post("/api/login")
    .set("X-Forwarded-For", ip)
    .send({ identifier, password: "wrong-password" });

describe("rate limiting (5 requests / 60s / IP)", () => {
  setupCleanDb();

  it("login: first 5 attempts pass through, the 6th gets 429 (no Retry-After, by design)", { timeout: 60_000 }, async () => {
    const user = await createUser();
    const ip = "203.0.113.10";

    for (let i = 0; i < 5; i++) {
      const res = await attemptLogin(user.username, ip);
      expect(res.status).toBe(401); // wrong password, but NOT limited
    }

    const blocked = await attemptLogin(user.username, ip);
    expect(blocked.status).toBe(429);
    expect(blocked.body.success).toBe(false);

    // Deliberate design decision: timing info is not exposed to the client.
    expect(blocked.headers["retry-after"]).toBeUndefined();
  });

  it("login: the limit is per IP, another IP is unaffected", { timeout: 60_000 }, async () => {
    const user = await createUser();

    for (let i = 0; i < 5; i++) await attemptLogin(user.username, "203.0.113.20");
    expect((await attemptLogin(user.username, "203.0.113.20")).status).toBe(429);

    const otherIp = await attemptLogin(user.username, "203.0.113.21");
    expect(otherIp.status).toBe(401); // reached the handler, not rate limited
  });

  it("register: the 6th request from one IP gets 429", { timeout: 90_000 }, async () => {
    const ip = "203.0.113.30";

    for (let i = 1; i <= 5; i++) {
      const res = await api
        .post("/api/register")
        .set("X-Forwarded-For", ip)
        .send({ username: `rl_user_${i}`, email: `rl${i}@test.com`, password: "secret123" });
      expect([200, 201]).toContain(res.status);
    }

    const blocked = await api
      .post("/api/register")
      .set("X-Forwarded-For", ip)
      .send({ username: "rl_user_6", email: "rl6@test.com", password: "secret123" });

    expect(blocked.status).toBe(429);
    expect(blocked.body.success).toBe(false);
    expect(blocked.headers["retry-after"]).toBeUndefined(); // same deliberate decision
  });
});
