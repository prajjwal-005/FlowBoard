import { describe, expect, it } from "vitest";
import { prisma } from "@/lib/prisma";
import { setupCleanDb } from "../setup";
import { api, cookieValue } from "../helpers/http";
import { createUser } from "../helpers/users";

const valid = { username: "alice_1", email: "alice@test.com", password: "secret123" };

describe("POST /api/register", () => {
  setupCleanDb();

  it("creates the user, hashes the password and sets both auth cookies", async () => {
    const res = await api.post("/api/register").send(valid);

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(cookieValue(res, "accessToken")).toBeTruthy();
    expect(cookieValue(res, "refreshToken")).toBeTruthy();

    const row = await prisma.user.findUnique({ where: { username: valid.username } });
    expect(row).not.toBeNull();
    expect(row!.passwordHash).not.toBe(valid.password);
    expect(row!.passwordHash).toMatch(/^\$2[aby]\$/); // bcrypt format
  });

  it("never leaks the password or its hash in the response", async () => {
    const res = await api.post("/api/register").send(valid);
    const row = await prisma.user.findUnique({ where: { username: valid.username } });

    const body = JSON.stringify(res.body);
    expect(body).not.toContain(valid.password);
    expect(body).not.toContain(row!.passwordHash);
    expect(body).not.toContain("passwordHash");
  });

  it("lowercases the username before storing it", async () => {
    const res = await api.post("/api/register").send({ ...valid, username: "Alice_1" });

    expect(res.status).toBe(201);
    const row = await prisma.user.findUnique({ where: { username: "alice_1" } });
    expect(row).not.toBeNull();
  });

  it("lowercases the email, so email login works however it was typed", async () => {
    const res = await api.post("/api/register").send({ ...valid, email: "Alice@Test.com" });
    expect(res.status).toBe(201);
    expect(await prisma.user.findUnique({ where: { email: "alice@test.com" } })).not.toBeNull();

    const login = await api.post("/api/login").send({ identifier: "Alice@Test.com", password: valid.password });
    expect(login.status).toBe(200);
  });

  it("accepts boundary values (3-char username, 20-char username, 8-char and 72-byte passwords)", async () => {
    const a = await api.post("/api/register").send({ username: "abc", email: "a@test.com", password: "12345678" });
    const b = await api
      .post("/api/register")
      .send({ username: "a".repeat(20), email: "b@test.com", password: "a".repeat(72) });

    expect(a.status).toBe(201);
    expect(b.status).toBe(201);
  });

  it("rejects a duplicate username with 409", async () => {
    await createUser({ username: "alice_1", email: "other@test.com" });
    const res = await api.post("/api/register").send(valid);

    expect(res.status).toBe(409);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toBe("Username already exists");
  });

  it("rejects a duplicate email with 409", async () => {
    await createUser({ username: "someone_else", email: valid.email });
    const res = await api.post("/api/register").send(valid);

    expect(res.status).toBe(409);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toBe("Email already exists");
  });

  it("does not create a second row when a duplicate is rejected", async () => {
    await createUser({ username: "alice_1", email: "other@test.com" });
    await api.post("/api/register").send(valid);

    expect(await prisma.user.count()).toBe(1);
  });

  it.each([
    ["username too short", { ...valid, username: "ab" }],
    ["username too long (21)", { ...valid, username: "a".repeat(21) }],
    ["username starts with digit", { ...valid, username: "1alice" }],
    ["username has invalid char", { ...valid, username: "bad-name" }],
    ["username has double underscore", { ...valid, username: "al__ice" }],
    ["invalid email", { ...valid, email: "not-an-email" }],
    ["password too short (7)", { ...valid, password: "1234567" }],
    ["password over 72 bytes (73)", { ...valid, password: "a".repeat(73) }],
    ["password under 72 chars but over 72 bytes", { ...valid, password: "é".repeat(37) }], // 74 bytes
    ["missing password", { username: valid.username, email: valid.email }],
    ["empty body", {}],
  ])("rejects invalid input: %s -> 400", async (_label, payload) => {
    const res = await api.post("/api/register").send(payload);

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(await prisma.user.count()).toBe(0);
  });
});