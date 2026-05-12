import { describe, expect, it } from "vitest";
import { createPocCourseManifest } from "@pbg/shared/courseManifest";
import type {
  AssignmentCoachRunRequest,
  AssignmentCoachRunResponse
} from "@pbg/shared/workflowContracts";
import { buildApp } from "../src/app.js";

describe("gateway API routes", () => {
  it("returns the POC course manifest", async () => {
    const app = buildApp();

    const response = await app.inject({
      method: "GET",
      url: "/api/courses/manifest"
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual(createPocCourseManifest());

    await app.close();
  });

  it("runs the deterministic POC assignment coach workflow", async () => {
    const app = buildApp();
    const request: AssignmentCoachRunRequest = {
      assignmentPath: "PBG/Assignments/connect-first-workflow.md",
      assignmentTitle: "Connect First Workflow",
      assignmentBody: "# Connect First Workflow\n\n- [ ] Run Assignment Coach\n",
      relatedContext: [
        {
          path: "PBG/Courses/pbg-academy-foundations/orientation/telegram-enrollment-to-academy.md",
          title: "Telegram Enrollment to Academy",
          body: "This starter lesson confirms the PBG Vault is connected."
        }
      ],
      localMetadata: {
        taskCount: 1,
        completedTaskCount: 0,
        tags: ["poc"]
      }
    };

    const response = await app.inject({
      method: "POST",
      url: "/api/workflows/assignment-coach/run",
      payload: request
    });
    const body = response.json<AssignmentCoachRunResponse>();

    expect(response.statusCode).toBe(200);
    expect(body).toMatchObject({
      runId: "poc-assignment-coach-run",
      status: "completed",
      creditCost: 1,
      result: {
        title: "Assignment Coach: Connect First Workflow"
      }
    });
    expect(body.result.summary).toContain("1 task");
    expect(body.result.nextSteps).toEqual([
      "Open PBG/Assignments/connect-first-workflow.md in Obsidian.",
      "Complete the next unchecked task.",
      "Sync progress back through the gateway when ready."
    ]);
    expect(body.result.markdown).toContain("Run ID: poc-assignment-coach-run");

    await app.close();
  });
});
