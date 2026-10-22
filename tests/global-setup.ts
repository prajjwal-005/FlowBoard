import { assertSafeTestEnv } from "./helpers/guard";

export default async function globalSetup() {
  assertSafeTestEnv(); // fail fast, once, before any test file loads

  try {
    await fetch("http://127.0.0.1:3000/api/profile", { signal: AbortSignal.timeout(15_000) });
  } catch {
    console.warn(
      "WARNING: test server not reachable at 127.0.0.1:3000. " +
        "Run `npm run test:server` in another terminal for integration tests."
    );
  }
}
