import { describe, expect, it } from "vitest";
import { isPbgScopedPath, normalizeVaultPath } from "../src/vaultScope.js";

describe("vault scope", () => {
  it("allows only PBG scoped paths", () => {
    expect(isPbgScopedPath("PBG/Assignments/a.md")).toBe(true);
    expect(isPbgScopedPath("PBG")).toBe(true);
    expect(isPbgScopedPath("PBG/")).toBe(true);
    expect(isPbgScopedPath("Personal/journal.md")).toBe(false);
    expect(isPbgScopedPath("PBG-private/a.md")).toBe(false);
  });

  it("normalizes safe vault paths without allowing traversal", () => {
    expect(normalizeVaultPath("PBG\\Assignments\\a.md")).toBe("PBG/Assignments/a.md");
    expect(normalizeVaultPath("../PBG/Assignments/a.md")).toBe("");
    expect(normalizeVaultPath("PBG//Assignments/a.md")).toBe("");
  });
});
