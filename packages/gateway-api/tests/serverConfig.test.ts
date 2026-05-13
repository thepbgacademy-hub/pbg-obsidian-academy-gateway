import { describe, expect, it } from "vitest";
import { resolveServerListenOptions } from "../src/server.js";

describe("server startup config", () => {
  it("defaults the gateway host to localhost", () => {
    expect(resolveServerListenOptions({}).host).toBe("localhost");
  });

  it("blocks seeded POC auth on a public production host", () => {
    expect(() =>
      resolveServerListenOptions({
        NODE_ENV: "production",
        HOST: "0.0.0.0"
      })
    ).toThrow("Refusing to start seeded POC auth on a public production host");
  });
});
