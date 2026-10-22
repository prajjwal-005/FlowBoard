import { describe, expect, it } from "vitest";
import request from "supertest";
import { setupCleanDb } from "../setup";
import { authCookie, createUser } from "../helpers/users";

const api = request("http://127.0.0.1:3000");

describe("test infra smoke", () => {
  setupCleanDb();

  it("createUser + real login sets accessToken cookie", async () => {
    const user = await createUser();
    const res = await api
      .post("/api/login")
      .send({ identifier: user.username, password: user.password });

    expect(res.status).toBe(200);
    const cookies = res.headers["set-cookie"] as unknown as string[];
    expect(cookies.join(";")).toContain("accessToken=");
  });

  it("authCookie is accepted by the server", async () => {
    const user = await createUser();
    const res = await api.get("/api/profile").set("Cookie", await authCookie(user));

    expect(res.status).toBe(200);
    expect(res.body.data.username).toBe(user.username);
  });

  it("DB is clean between tests", async () => {
    // user_N from previous tests must be gone; this one is the only user
    const user = await createUser({ username: "solo_user" });
    const res = await api.get("/api/profile").set("Cookie", await authCookie(user));
    expect(res.body.data.username).toBe("solo_user");
  });
});
