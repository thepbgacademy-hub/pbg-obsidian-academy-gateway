import { describe, expect, it } from "vitest";
import type { AssignmentCoachRunRequest } from "@pbg/shared/workflowContracts";
import { PbgGatewayApiClient } from "../src/apiClient.js";

describe("PbgGatewayApiClient", () => {
  it("forms the course manifest URL from the configured gateway base URL", async () => {
    const requestedUrls: string[] = [];
    const client = new PbgGatewayApiClient("http://localhost:8787/base-path", async (input) => {
      requestedUrls.push(input.toString());
      return new Response(JSON.stringify({ manifestVersion: "test", files: [] }));
    });

    await client.getCourseManifest();

    expect(requestedUrls).toEqual(["http://localhost:8787/api/courses/manifest"]);
  });

  it("uses a safe default fetch wrapper without requiring a bound method reference", async () => {
    const originalFetch = globalThis.fetch;
    const requestedUrls: string[] = [];
    globalThis.fetch = (async (input) => {
      requestedUrls.push(input.toString());
      return new Response(JSON.stringify({ manifestVersion: "test", files: [] }));
    }) as typeof fetch;

    try {
      const client = new PbgGatewayApiClient("http://localhost:8787/base-path");
      await client.getCourseManifest();
    } finally {
      globalThis.fetch = originalFetch;
    }

    expect(requestedUrls).toEqual(["http://localhost:8787/api/courses/manifest"]);
  });

  it("sends bearer authorization for protected requests when an access token exists", async () => {
    const requests: Array<{ url: string; init?: RequestInit }> = [];
    const client = new PbgGatewayApiClient(
      "http://localhost:8787",
      async (input, init) => {
        requests.push({ url: input.toString(), init });
        return new Response(JSON.stringify({ manifestVersion: "test", files: [] }));
      },
      "short-lived-token"
    );

    await client.getCourseManifest();

    expect(requests).toHaveLength(1);
    expect(requests[0]?.init?.headers).toEqual({
      authorization: "Bearer short-lived-token"
    });
  });

  it("stores the access token returned by login for later protected requests", async () => {
    const requests: Array<{ url: string; init?: RequestInit }> = [];
    const client = new PbgGatewayApiClient("http://localhost:8787", async (input, init) => {
      requests.push({ url: input.toString(), init });
      if (input.toString().endsWith("/api/auth/login")) {
        return new Response(
          JSON.stringify({
            accessToken: "short-lived-token",
            refreshToken: "refresh-token",
            student: {
              studentId: "00000000-0000-4000-8000-000000000101",
              displayName: "PBG Test Student",
              tier: "pro",
              standingGood: true,
              creditBalance: 250
            },
            device: {
              deviceId: "00000000-0000-4000-8000-000000000301",
              vaultId: "sha256-vault-id",
              status: "active"
            }
          })
        );
      }

      return new Response(JSON.stringify({ manifestVersion: "test", files: [] }));
    });

    await client.login({
      username: "pbg_test_student",
      password: "pbg-test-password",
      vaultId: "sha256-vault-id",
      deviceFingerprint: "sha256-device-fingerprint",
      pluginVersion: "0.1.0"
    });
    await client.getCourseManifest();

    expect(requests.at(-1)?.init?.headers).toEqual({
      authorization: "Bearer short-lived-token"
    });
  });

  it("posts login credentials to the auth login route", async () => {
    const requests: Array<{ url: string; init?: RequestInit }> = [];
    const client = new PbgGatewayApiClient("http://localhost:8787", async (input, init) => {
      requests.push({ url: input.toString(), init });
      return new Response(
        JSON.stringify({
          accessToken: "access-token",
          refreshToken: "refresh-token",
          student: {
            studentId: "00000000-0000-4000-8000-000000000101",
            displayName: "PBG Test Student",
            tier: "pro",
            standingGood: true,
            creditBalance: 250
          },
          device: {
            deviceId: "00000000-0000-4000-8000-000000000301",
            vaultId: "sha256-vault-id",
            status: "active"
          }
        })
      );
    });

    const result = await client.login({
      username: "pbg_test_student",
      password: "pbg-test-password",
      vaultId: "sha256-vault-id",
      deviceFingerprint: "sha256-device-fingerprint",
      pluginVersion: "0.1.0"
    });

    expect(result.accessToken).toBe("access-token");
    expect(requests).toHaveLength(1);
    expect(requests[0]).toMatchObject({
      url: "http://localhost:8787/api/auth/login",
      init: {
        method: "POST",
        headers: {
          "content-type": "application/json"
        }
      }
    });
    expect(requests[0]?.init?.body).toBe(
      JSON.stringify({
        username: "pbg_test_student",
        password: "pbg-test-password",
        vaultId: "sha256-vault-id",
        deviceFingerprint: "sha256-device-fingerprint",
        pluginVersion: "0.1.0"
      })
    );
  });

  it("posts assignment coach payloads to the workflow run route", async () => {
    const requests: Array<{ url: string; init?: RequestInit }> = [];
    const payload: AssignmentCoachRunRequest = {
      assignmentPath: "PBG/Assignments/connect-first-workflow.md",
      assignmentTitle: "Connect First Workflow",
      assignmentBody: "# Connect First Workflow\n",
      relatedContext: [],
      localMetadata: {
        taskCount: 0,
        completedTaskCount: 0,
        tags: []
      }
    };
    const client = new PbgGatewayApiClient("http://localhost:8787", async (input, init) => {
      requests.push({ url: input.toString(), init });
      return new Response(
        JSON.stringify({
          runId: "run-001",
          status: "completed",
          creditCost: 1,
          result: {
            title: "Assignment Coach Result",
            summary: "Ready",
            nextSteps: [],
            markdown: "# Result\n"
          }
        })
      );
    });

    const result = await client.runAssignmentCoach(payload);

    expect(result.runId).toBe("run-001");
    expect(requests).toHaveLength(1);
    expect(requests[0]).toMatchObject({
      url: "http://localhost:8787/api/workflows/assignment-coach/run",
      init: {
        method: "POST",
        headers: {
          "content-type": "application/json"
        }
      }
    });
    expect(requests[0]?.init?.body).toBe(JSON.stringify(payload));
  });

  it("posts assignment coach previews to the protected preview route", async () => {
    const requests: Array<{ url: string; init?: RequestInit }> = [];
    const payload: AssignmentCoachRunRequest = {
      assignmentPath: "PBG/Assignments/connect-first-workflow.md",
      assignmentTitle: "Connect First Workflow",
      assignmentBody: "# Connect First Workflow\n",
      relatedContext: [],
      localMetadata: {
        taskCount: 0,
        completedTaskCount: 0,
        tags: []
      }
    };
    const client = new PbgGatewayApiClient(
      "http://localhost:8787",
      async (input, init) => {
        requests.push({ url: input.toString(), init });
        return new Response(
          JSON.stringify({
            status: "preview",
            assignmentPath: payload.assignmentPath,
            assignmentTitle: payload.assignmentTitle,
            summary: "Ready",
            contextCount: 0,
            taskCount: 0,
            completedTaskCount: 0
          })
        );
      },
      "short-lived-token"
    );

    const result = await client.previewAssignmentCoach(payload);

    expect(result.summary).toBe("Ready");
    expect(requests).toHaveLength(1);
    expect(requests[0]).toMatchObject({
      url: "http://localhost:8787/api/workflows/assignment-coach/preview",
      init: {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: "Bearer short-lived-token"
        }
      }
    });
    expect(requests[0]?.init?.body).toBe(JSON.stringify(payload));
  });

  it("gets workflow run details from the protected run lookup route", async () => {
    const requests: Array<{ url: string; init?: RequestInit }> = [];
    const client = new PbgGatewayApiClient(
      "http://localhost:8787",
      async (input, init) => {
        requests.push({ url: input.toString(), init });
        return new Response(
          JSON.stringify({
            runId: "poc-assignment-coach-run",
            status: "completed",
            creditCost: 1,
            result: {
              title: "Assignment Coach: POC Run",
              summary: "Ready",
              nextSteps: [],
              markdown: "# Result\n"
            }
          })
        );
      },
      "short-lived-token"
    );

    const result = await client.getWorkflowRun("poc-assignment-coach-run");

    expect(result.runId).toBe("poc-assignment-coach-run");
    expect(requests).toHaveLength(1);
    expect(requests[0]).toMatchObject({
      url: "http://localhost:8787/api/workflows/runs/poc-assignment-coach-run",
      init: {
        headers: {
          authorization: "Bearer short-lived-token"
        }
      }
    });
  });

  it("fetches academy announcement items from the gateway", async () => {
    const requests: Array<{ url: string; init?: RequestInit }> = [];
    const client = new PbgGatewayApiClient(
      "http://localhost:8787",
      async (input, init) => {
        requests.push({ url: input.toString(), init });
        return new Response(
          JSON.stringify({
            items: [
              {
                id: "academy-announcement-orientation",
                label: "Academy Update",
                text: "Orientation week resources are now live in your PBG vault.",
                href: "https://github.com/thepbgacademy-hub/pbg-obsidian-academy-gateway",
                publishedAt: "2026-05-15T00:00:00.000Z",
                expiresAt: null,
                isActive: true
              }
            ]
          })
        );
      },
      "short-lived-token"
    );

    const result = await client.getDashboardAnnouncements();

    expect(result.items).toHaveLength(1);
    expect(result.items[0]?.id).toBe("academy-announcement-orientation");
    expect(requests).toHaveLength(1);
    expect(requests[0]).toMatchObject({
      url: "http://localhost:8787/api/dashboard/announcements",
      init: {
        headers: {
          authorization: "Bearer short-lived-token"
        }
      }
    });
  });

  it("fetches the discussion badge status from the gateway", async () => {
    const requests: Array<{ url: string; init?: RequestInit }> = [];
    const client = new PbgGatewayApiClient(
      "http://localhost:8788",
      async (input, init) => {
        requests.push({ url: input.toString(), init });
        return new Response(
          JSON.stringify({
            label: "PBG Discussion",
            href: "https://t.me/+Xpdv7ztBFFc1MGVh",
            unreadCount: 3
          })
        );
      },
      "short-lived-token"
    );

    const result = await client.getDiscussionStatus();

    expect(result.unreadCount).toBe(3);
    expect(requests[0]).toMatchObject({
      url: "http://localhost:8788/api/lounge/discussion-status",
      init: {
        headers: {
          authorization: "Bearer short-lived-token"
        }
      }
    });
  });

  it("marks the discussion badge seen through the gateway", async () => {
    const requests: Array<{ url: string; init?: RequestInit }> = [];
    const client = new PbgGatewayApiClient(
      "http://localhost:8788",
      async (input, init) => {
        requests.push({ url: input.toString(), init });
        return new Response(
          JSON.stringify({
            ok: true,
            unreadCount: 0
          })
        );
      },
      "short-lived-token"
    );

    const result = await client.markDiscussionSeen();

    expect(result.ok).toBe(true);
    expect(requests[0]).toMatchObject({
      url: "http://localhost:8788/api/lounge/discussion-seen",
      init: {
        method: "POST",
        headers: {
          authorization: "Bearer short-lived-token"
        }
      }
    });
  });

  it("includes workflow response details for non-ok assignment coach errors", async () => {
    const client = new PbgGatewayApiClient("http://localhost:8787", async () => {
      return new Response("credits exhausted", {
        status: 402,
        statusText: "Payment Required"
      });
    });

    await expect(
      client.runAssignmentCoach({
        assignmentPath: "PBG/Assignments/connect-first-workflow.md",
        assignmentTitle: "Connect First Workflow",
        assignmentBody: "# Connect First Workflow\n",
        relatedContext: [],
        localMetadata: {
          taskCount: 0,
          completedTaskCount: 0,
          tags: []
        }
      })
    ).rejects.toThrow("Gateway request failed (402 Payment Required): credits exhausted");
  });
});
