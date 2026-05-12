import { describe, expect, it } from "vitest";
import type { CourseManifest } from "@pbg/shared/courseManifest";
import { getManifestWritePlan } from "../src/courseSync.js";

describe("course manifest sync planning", () => {
  it("plans writes for PBG files", () => {
    const manifest: CourseManifest = {
      manifestVersion: "test",
      files: [
        {
          path: "PBG/Courses/foundations/lesson.md",
          sha256: "abc",
          kind: "lesson",
          title: "Lesson",
          body: "# Lesson\n"
        },
        {
          path: "PBG/Assignments/task.md",
          sha256: "def",
          kind: "assignment",
          title: "Task",
          body: "# Task\n"
        }
      ]
    };

    expect(getManifestWritePlan(manifest)).toEqual([
      {
        path: "PBG/Courses/foundations/lesson.md",
        body: "# Lesson\n"
      },
      {
        path: "PBG/Assignments/task.md",
        body: "# Task\n"
      }
    ]);
  });

  it("rejects non-PBG paths", () => {
    const manifest: CourseManifest = {
      manifestVersion: "test",
      files: [
        {
          path: "Notes/outside.md",
          sha256: "abc",
          kind: "lesson",
          title: "Outside",
          body: "# Outside\n"
        }
      ]
    };

    expect(() => getManifestWritePlan(manifest)).toThrow("outside PBG");
  });
});
