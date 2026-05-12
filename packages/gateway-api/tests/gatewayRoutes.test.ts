import { describe, expect, it } from "vitest";
import { API_ROUTES } from "@pbg/shared/contracts";
import { createPocCourseManifest } from "@pbg/shared/courseManifest";
import type {
  AssignmentCoachRunRequest,
  AssignmentCoachRunResponse
} from "@pbg/shared/workflowContracts";
import { buildApp, POC_REFRESH_TOKEN } from "../src/app.js";

async function getAccessToken(): Promise<string> {
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
  await app.close();

  return response.json<{ accessToken: string }>().accessToken;
}

async function authHeaders(): Promise<{ authorization: string }> {
  return {
    authorization: `Bearer ${await getAccessToken()}`
  };
}

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
      url: API_ROUTES.dashboardMe,
      headers: await authHeaders()
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

  it("rejects unauthenticated dashboard requests", async () => {
    const app = buildApp();

    const response = await app.inject({
      method: "GET",
      url: API_ROUTES.dashboardMe
    });

    expect(response.statusCode).toBe(401);
    expect(response.json()).toEqual({
      error: "Missing or invalid bearer token"
    });

    await app.close();
  });

  it("returns the POC course manifest", async () => {
    const app = buildApp();

    const response = await app.inject({
      method: "GET",
      url: API_ROUTES.courseManifest,
      headers: await authHeaders()
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual(createPocCourseManifest());

    await app.close();
  });

  it("rejects unauthenticated course manifest requests", async () => {
    const app = buildApp();

    const response = await app.inject({
      method: "GET",
      url: API_ROUTES.courseManifest
    });

    expect(response.statusCode).toBe(401);
    expect(response.json()).toEqual({
      error: "Missing or invalid bearer token"
    });

    await app.close();
  });

  it("returns a POC assignment coach preview without echoing the assignment body", async () => {
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
      url: API_ROUTES.assignmentCoachPreview,
      headers: await authHeaders(),
      payload: request
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({
      status: "preview",
      assignmentPath: "PBG/Assignments/connect-first-workflow.md",
      assignmentTitle: "Connect First Workflow",
      summary:
        "Preview prepared for Connect First Workflow with 1 related context item and 1 open task.",
      contextCount: 1,
      taskCount: 1,
      completedTaskCount: 0
    });
    expect(response.body).not.toContain(request.assignmentBody);

    await app.close();
  });

  it("rejects unauthenticated assignment coach previews", async () => {
    const app = buildApp();

    const response = await app.inject({
      method: "POST",
      url: API_ROUTES.assignmentCoachPreview,
      payload: {
        assignmentPath: "PBG/Assignments/connect-first-workflow.md",
        assignmentTitle: "Connect First Workflow",
        assignmentBody: "# Connect First Workflow\n",
        relatedContext: [],
        localMetadata: {
          taskCount: 0,
          completedTaskCount: 0,
          tags: []
        }
      }
    });

    expect(response.statusCode).toBe(401);
    expect(response.json()).toEqual({
      error: "Missing or invalid bearer token"
    });

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
      headers: await authHeaders(),
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

  it("rejects unauthenticated assignment coach runs", async () => {
    const app = buildApp();

    const response = await app.inject({
      method: "POST",
      url: API_ROUTES.assignmentCoachRun,
      payload: {
        assignmentPath: "PBG/Assignments/connect-first-workflow.md",
        assignmentTitle: "Connect First Workflow",
        assignmentBody: "# Connect First Workflow\n",
        relatedContext: [],
        localMetadata: {
          taskCount: 0,
          completedTaskCount: 0,
          tags: []
        }
      }
    });

    expect(response.statusCode).toBe(401);
    expect(response.json()).toEqual({
      error: "Missing or invalid bearer token"
    });

    await app.close();
  });

  it.each([
    ["Private/journal.md", 403],
    ["PBG/Assignments/journal.txt", 400]
  ])("rejects assignment coach runs outside assignment markdown scope: %s", async (assignmentPath, statusCode) => {
    const app = buildApp();

    const response = await app.inject({
      method: "POST",
      url: API_ROUTES.assignmentCoachRun,
      headers: await authHeaders(),
      payload: {
        assignmentPath,
        assignmentTitle: "Journal",
        assignmentBody: "# Private body must not be accepted\n",
        relatedContext: [],
        localMetadata: {
          taskCount: 0,
          completedTaskCount: 0,
          tags: []
        }
      }
    });

    expect(response.statusCode).toBe(statusCode);
    expect(response.body).not.toContain("Private body must not be accepted");

    await app.close();
  });

  it("returns the deterministic POC workflow run result by run id", async () => {
    const app = buildApp();

    const response = await app.inject({
      method: "GET",
      url: "/api/workflows/runs/poc-assignment-coach-run",
      headers: await authHeaders()
    });

    expect(response.statusCode).toBe(200);
    expect(response.json<AssignmentCoachRunResponse>()).toMatchObject({
      runId: "poc-assignment-coach-run",
      status: "completed",
      creditCost: 1,
      result: {
        title: "Assignment Coach: POC Run"
      }
    });

    await app.close();
  });

  it("returns 404 for unknown workflow run ids", async () => {
    const app = buildApp();

    const response = await app.inject({
      method: "GET",
      url: "/api/workflows/runs/unknown-run",
      headers: await authHeaders()
    });

    expect(response.statusCode).toBe(404);
    expect(response.json()).toEqual({
      error: "Workflow run not found"
    });

    await app.close();
  });

  it("rejects unauthenticated workflow run lookups", async () => {
    const app = buildApp();

    const response = await app.inject({
      method: "GET",
      url: "/api/workflows/runs/poc-assignment-coach-run"
    });

    expect(response.statusCode).toBe(401);
    expect(response.json()).toEqual({
      error: "Missing or invalid bearer token"
    });

    await app.close();
  });
});
