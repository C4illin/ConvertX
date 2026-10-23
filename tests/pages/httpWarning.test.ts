import { afterEach, describe, expect, test } from "bun:test";
import { runInNewContext } from "node:vm";
import { firstRun, request, resetEnv, setEnv } from "./helpers/app";

afterEach(() => {
  resetEnv();
});

describe("HTTP configuration warning", () => {
  test("is visible without JavaScript on the first-run setup page", () => {
    expect(firstRun?.setup.body).toContain('id="http-warning"');
    expect(firstRun?.setup.body).not.toMatch(/<div[^>]*id="http-warning"[^>]*\bhidden\b/);
    expect(firstRun?.setup.body).toContain("HTTP_ALLOWED=true");
  });

  test.each(["/login", "/register", "/"])(
    "is visible without JavaScript on %s when HTTP is not allowed",
    async (path) => {
      setEnv({ HTTP_ALLOWED: false, ACCOUNT_REGISTRATION: true, ALLOW_UNAUTHENTICATED: true });

      const response = await request(path);
      const body = await response.text();

      expect(response.status).toBe(200);
      expect(body).toContain('id="http-warning"');
      expect(body).not.toMatch(/<div[^>]*id="http-warning"[^>]*\bhidden\b/);
      expect(body).toContain('role="alert"');
      expect(body).toContain("HTTPS");
      expect(body).toContain("HTTP_ALLOWED=true");
      expect(body).toContain("trusted local network");
    },
  );

  test.each(["/login", "/register", "/"])("is omitted on %s when HTTP is allowed", async (path) => {
    setEnv({ HTTP_ALLOWED: true, ACCOUNT_REGISTRATION: true, ALLOW_UNAUTHENTICATED: true });

    const response = await request(path);

    expect(response.status).toBe(200);
    expect(await response.text()).not.toContain("http-warning");
  });

  test.each([
    ["http://convertx.example/login", false, true],
    ["http://192.168.1.10:3000/setup", false, true],
    ["http://convertx.example/convert/login", false, true],
    ["https://convertx.example/login", true, false],
    ["https://convertx.example/convert/", false, false],
    ["http://localhost:3000/login", true, false],
    ["http://convertx.localhost:3000/login", true, false],
    ["http://127.0.0.1:3000/login", true, false],
    ["http://127.0.0.2:3000/login", true, false],
    ["http://[::1]:3000/login", true, false],
  ])(
    "uses the browser's connection for %s (secure context: %s)",
    async (url, isSecureContext, visible) => {
      setEnv({ HTTP_ALLOWED: false });
      // The server-side request is always HTTP localhost, like an HTTPS reverse proxy's backend.
      const body = await (await request("/login")).text();
      const script = body.match(/<script>([\s\S]*?)<\/script>/)?.[1];
      expect(script).toBeDefined();
      const warning = { hidden: /<div[^>]*id="http-warning"[^>]*\bhidden\b/.test(body) };

      runInNewContext(script ?? "", {
        window: { location: new URL(url), isSecureContext },
        document: {
          getElementById(id: string) {
            expect(id).toBe("http-warning");
            return warning;
          },
        },
      });

      expect(warning.hidden).toBe(!visible);
    },
  );
});
