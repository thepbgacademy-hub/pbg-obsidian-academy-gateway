import { describe, expect, it } from "vitest";
import { createOpaqueToken, hashToken } from "../src/auth/sessions.js";

describe("session token helpers", () => {
  it("creates distinct opaque base64url tokens", () => {
    const first = createOpaqueToken();
    const second = createOpaqueToken();

    expect(first).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(second).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(first).not.toBe(second);
  });

  it("hashes tokens with a stable sha256 hex digest", () => {
    expect(hashToken("poc-refresh-token")).toBe(
      "e2d3dec25bf377333534366759076fe67b7fd66c5ab9c0ae8727ac395cf3adf4"
    );
  });
});
