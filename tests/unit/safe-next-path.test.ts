import { describe, expect, it } from "vitest";
import { safeNextPath } from "@/lib/safe-next-path";

describe("safeNextPath", () => {
  it.each(["/dashboard", "/boards/abc-123", "/boards?x=1&y=2"])("keeps the local path %s", (p) => {
    expect(safeNextPath(p)).toBe(p);
  });

  it.each([
    null, "", "dashboard", "https://evil.com", "//evil.com", "///evil", "/\\evil",
    "javascript:alert(1)", "/%2f/evil", "/a b", "/a.b",
  ])("falls back to /dashboard for %s", (p) => {
    expect(safeNextPath(p)).toBe("/dashboard");
  });

  // These three pass only after you add the BLOCKED guard to safeNextPath.
  it.each(["/api/auth/refresh", "/login", "/register?next=/x"])("refuses loop targets: %s", (p) => {
    expect(safeNextPath(p)).toBe("/dashboard");
  });
});