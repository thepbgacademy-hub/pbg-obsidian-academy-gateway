import { describe, expect, it } from "vitest";
import {
  computeLocalPbgDashboardState,
  computeLocalPbgMetrics,
  formatLocalPbgMetricLabels
} from "../src/localState.js";

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

  it("builds dashboard state from scoped academy files without leaking outside notes", () => {
    const state = computeLocalPbgDashboardState([
      {
        path: "PBG/Courses/foundations/orientation.md",
        body: "# Orientation\n#academy\n"
      },
      {
        path: "PBG/Assignments/connect-first-workflow.md",
        body: [
          "# Connect First Workflow",
          "",
          "- [ ] Draft a workflow reflection",
          "- [x] Sync the course manifest"
        ].join("\n")
      },
      {
        path: "PBG/Assignments/week-02.md",
        body: "# Week 02\n"
      },
      {
        path: "PBG/Workflow Results/run-001.md",
        body: "# Result\n"
      },
      {
        path: "Private/journal.md",
        body: "- [ ] This private task must stay out"
      }
    ]);

    expect(state.metrics).toEqual({
      courseFileCount: 1,
      assignmentFileCount: 2,
      workflowResultFileCount: 1,
      academyTaggedFileCount: 1,
      taskCount: 2,
      completedTaskCount: 1,
      openTaskCount: 1
    });
    expect(state.currentFocus).toEqual({
      assignmentPath: "PBG/Assignments/connect-first-workflow.md",
      title: "Connect First Workflow",
      nextTodo: "Draft a workflow reflection",
      progressLabel: "1 of 2 tasks complete"
    });
    expect(state.assignments).toEqual([
      {
        path: "PBG/Assignments/connect-first-workflow.md",
        title: "Connect First Workflow",
        taskCount: 2,
        completedTaskCount: 1,
        status: "in-progress"
      },
      {
        path: "PBG/Assignments/week-02.md",
        title: "Week 02",
        taskCount: 0,
        completedTaskCount: 0,
        status: "not-started"
      }
    ]);
    expect(state.todos).toEqual([
      {
        path: "PBG/Assignments/connect-first-workflow.md",
        text: "Draft a workflow reflection"
      }
    ]);
    expect(state.heatmap).toEqual([
      { label: "Courses", count: 1, intensity: 1 },
      { label: "Assignments", count: 2, intensity: 1 },
      { label: "Workflow Results", count: 1, intensity: 1 }
    ]);
  });

  it("keeps local classroom state intact for shell rendering", () => {
    const state = computeLocalPbgDashboardState([
      {
        path: "PBG/Assignments/connect-first-workflow.md",
        body: "# Connect First Workflow\n\n- [ ] Draft a workflow reflection\n"
      }
    ]);

    expect(state.currentFocus?.title).toBe("Connect First Workflow");
    expect(state.todos[0]?.text).toBe("Draft a workflow reflection");
  });
});
