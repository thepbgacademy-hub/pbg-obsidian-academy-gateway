import { describe, expect, it } from "vitest";
import { computeLocalPbgMetrics, formatLocalPbgMetricLabels } from "../src/localState.js";

describe("local PBG state", () => {
  it("counts local course, assignment, and workflow result files from PBG paths only", () => {
    const metrics = computeLocalPbgMetrics([
      "PBG/Courses/foundations/orientation.md",
      "PBG/Courses/foundations/assets/banner.png",
      "PBG/Assignments/connect-first-workflow.md",
      "PBG/Workflow Results/run-001.md",
      "PBG/Workflow Results/run-002.md",
      "Personal/journal.md",
      "PBG-private/Courses/leak.md"
    ]);

    expect(metrics).toEqual({
      courseFileCount: 1,
      assignmentFileCount: 1,
      workflowResultFileCount: 2
    });
  });

  it("formats dashboard labels for local metrics", () => {
    expect(
      formatLocalPbgMetricLabels({
        courseFileCount: 2,
        assignmentFileCount: 1,
        workflowResultFileCount: 0
      })
    ).toEqual(["Course files: 2", "Assignment files: 1", "Workflow result files: 0"]);
  });
});
