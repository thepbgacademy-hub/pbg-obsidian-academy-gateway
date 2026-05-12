import { describe, expect, it } from "vitest";
import { createHash } from "node:crypto";
import { createPocCourseManifest } from "../src/courseManifest.js";

describe("course manifest", () => {
  it("returns local-first PBG files", () => {
    const manifest = createPocCourseManifest();

    expect(manifest.manifestVersion).toBe("2026-05-12-poc");
    expect(manifest.files.map((file) => file.path)).toContain(
      "PBG/Assignments/connect-first-workflow.md"
    );
    expect(manifest.files.every((file) => file.path.startsWith("PBG/"))).toBe(true);
  });

  it("uses deterministic SHA-256 hashes for each file body", () => {
    const manifest = createPocCourseManifest();

    for (const file of manifest.files) {
      const bodyHash = createHash("sha256").update(file.body).digest("hex");

      expect(file.sha256).toMatch(/^[0-9a-f]{64}$/);
      expect(file.sha256).toBe(bodyHash);
    }
  });
});
