import { describe, expect, it } from "vitest";
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
});
