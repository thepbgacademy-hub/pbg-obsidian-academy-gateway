import { describe, expect, it } from "vitest";
import { getCoachThreadPath, getReportArtifactPaths } from "../src/coachStorage.js";

describe("coachStorage", () => {
  it("builds a single markdown path per assignment thread", () => {
    expect(getCoachThreadPath("assignment", "connect-first-workflow"))
      .toBe("PBG/Coach Threads/assignment-connect-first-workflow.md");
  });

  it("builds expanded report artifact paths", () => {
    expect(getReportArtifactPaths("expanded-pdf-md", "connect-first-workflow")).toEqual([
      "PBG/Reports/connect-first-workflow-expanded-report.pdf",
      "PBG/Reports/connect-first-workflow-expanded-report.md"
    ]);
  });
});
