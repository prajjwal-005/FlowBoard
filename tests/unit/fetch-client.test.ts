import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("sonner", () => ({ toast: { message: vi.fn() } }));
vi.mock("next/navigation", () => ({ redirect: vi.fn() }));

import { api } from "@/lib/fetch"; // use the real path of fetch.ts

const json = (status: number, body: unknown = {}) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

let loc: { origin: string; href: string };

beforeEach(() => {
  loc = { origin: "http://localhost:3000", href: "" };
  vi.stubGlobal("window", { location: loc });
});
afterEach(() => vi.unstubAllGlobals());

/** Protected calls 401 until a refresh has happened (200, or 409 meaning someone else rotated). */
function mockServer(refreshResult: () => Response) {
  let refreshed = false;
  const fn = vi.fn(async (input: RequestInfo | URL) => {
    const url = String(input);
    if (url.endsWith("/api/auth/refresh")) {
      await sleep(20); // keep the refresh in flight while the other 401s arrive
      const res = refreshResult();
      if (res.ok || res.status === 409) refreshed = true;
      return res;
    }
    return refreshed ? json(200, { ok: true }) : json(401);
  });
  vi.stubGlobal("fetch", fn);
  return fn;
}

const refreshCalls = (fn: ReturnType<typeof vi.fn>) =>
  fn.mock.calls.filter(([u]) => String(u).endsWith("/api/auth/refresh")).length;

describe("fetchClient: refresh on 401", () => {
  it("concurrent 401s share ONE refresh, and every request is retried", async () => {
    const fn = mockServer(() => json(200, { success: true }));

    const results = await Promise.all([api.get("/api/boards"), api.get("/api/boards"), api.get("/api/boards")]);

    expect(results).toEqual([{ ok: true }, { ok: true }, { ok: true }]);
    expect(refreshCalls(fn)).toBe(1);
    expect(loc.href).toBe("");
  });

  it("a 409 from refresh (another request rotated) still ends in a successful retry", async () => {
    const fn = mockServer(() => json(409));

    await expect(api.get("/api/boards")).resolves.toEqual({ ok: true });
    expect(refreshCalls(fn)).toBe(1);
  });

  it("refresh 401 -> redirects to /login", async () => {
    mockServer(() => json(401));

    await expect(api.get("/api/boards")).rejects.toThrow("Unauthenticated");
    expect(loc.href).toBe("/login");
  });

  it.each([
    ["server error", () => json(500)],
    ["network failure", () => { throw new Error("network down"); }],
  ])("refresh %s -> throws and does NOT log the user out", async (_label, result) => {
    mockServer(result as () => Response);

    await expect(api.get("/api/boards")).rejects.toThrow("Could not refresh session");
    expect(loc.href).toBe("");
  });

  it("a request that is still 401 after a successful refresh does not loop", async () => {
    const fn = vi.fn(async (input: RequestInfo | URL) =>
      String(input).endsWith("/api/auth/refresh") ? json(200) : json(401)
    );
    vi.stubGlobal("fetch", fn);

    await expect(api.get("/api/boards")).rejects.toThrow("Unauthenticated");
    expect(refreshCalls(fn)).toBe(1);
    expect(loc.href).toBe("/login");
  });
});