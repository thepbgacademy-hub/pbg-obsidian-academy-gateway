import { describe, expect, it } from "vitest";
import { PBG_REQUIRED_PATHS } from "../src/onboarding.js";

describe("PBG onboarding", () => {
  it("defines the required vault paths", () => {
    expect(PBG_REQUIRED_PATHS).toEqual([
      "PBG",
      "PBG/Dashboard",
      "PBG/Courses",
      "PBG/Assignments",
      "PBG/Notes",
      "PBG/Workflow Results",
      "PBG/Templates",
      "PBG/System"
    ]);
  });
});
