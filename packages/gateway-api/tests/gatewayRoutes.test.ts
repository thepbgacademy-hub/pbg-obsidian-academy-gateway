import { describe, expect, it } from "vitest";
import { API_ROUTES } from "@pbg/shared/contracts";
import { createPocCourseManifest } from "@pbg/shared/courseManifest";
import type {
  AssignmentCoachRunRequest,
  AssignmentCoachRunResponse
} from "@pbg/shared/workflowContracts";
import { buildApp, POC_REFRESH_TOKEN } from "../src/app.js";

describe("gateway API routes", () => {
  it("accepts the seeded POC credentials", async () => {
    const app = buildApp();

    const response = await app.inject({
      method: "POST",
      url: API_ROUTES.authLogin,
      payload: {
        username: "pbg_test_student",
        password: "pbg-test-password",
        vaultId: "sha256-vault-id",
        deviceFingerprint: "sha256-device-fingerprint",
        pluginVersion: "0.1.0"
      }
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({
      accessToken: "short-lived-token",
      refreshToken: POC_REFRESH_TOKEN,
      student: {
        studentId: "00000000-0000-4000-8000-000000000101",
        displayName: "PBG Test Student",
        tier: "pro",
        standingGood: true,
        creditBalance: 250
      },
      device: {
        deviceId: "uuid",
        vaultId: "sha256-vault-id",
        status: "active"
      }
    });

    await app.close();
  });

  it("rejects invalid POC credentials", async () => {
    const app = buildApp();

    const response = await app.inject({
      method: "POST",
      url: API_ROUTES.authLogin,
      payload: {
        username: "pbg_test_student",
        password: "wrong-password",
        vaultId: "sha256-vault-id",
        deviceFingerprint: "sha256-device-fingerprint",
        pluginVersion: "0.1.0"
      }
    });

    expect(response.statusCode).toBe(401);
    expect(response.json()).toEqual({
      error: "Invalid username or password"
    });

    await app.close();
  });

  it("returns the POC dashboard state", async () => {
    const app = buildApp();

    const response = await app.inject({
      method: "GET",
      url: API_ROUTES.dashboardMe
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({
      student: {
        studentId: "00000000-0000-4000-8000-000000000101",
        tier: "pro",
        standingGood: true,
        creditBalance: 250
      },
      workflows: [
        {
          slug: "assignment-coach",
          name: "Assignment Coach",
          enabled: true,
          creditCost: 1
        }
      ],
      courseManifestVersion: "2026-05-12-poc"
    });

    await app.close();
  });

  it("returns the POC course manifest", async () => {
    const app = buildApp();

    const response = await app.inject({
      method: "GET",
      url: API_ROUTES.courseManifest
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
      url: API_ROUTES.assignmentCoachRun,
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
