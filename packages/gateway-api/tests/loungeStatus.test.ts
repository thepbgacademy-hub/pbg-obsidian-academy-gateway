import { describe, expect, it } from "vitest";
import { API_ROUTES } from "@pbg/shared/contracts";
import { buildApp } from "../src/app.js";

async function loginHeaders(app: ReturnType<typeof buildApp>): Promise<{ authorization: string }> {
  const login = await app.inject({
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
  const { accessToken } = login.json<{ accessToken: string }>();

  return { authorization: `Bearer ${accessToken}` };
}

describe("discussion lounge routes", () => {
  it("rejects unauthenticated discussion status requests", async () => {
    const app = buildApp();

    const response = await app.inject({
      method: "GET",
      url: API_ROUTES.discussionStatus
    });

    expect(response.statusCode).toBe(401);
    expect(response.json()).toEqual({
      error: "Missing or invalid bearer token"
    });

    await app.close();
  });

  it("returns the student-specific discussion count", async () => {
    const app = buildApp();

    const response = await app.inject({
      method: "GET",
      url: API_ROUTES.discussionStatus,
      headers: await loginHeaders(app)
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({
      label: "PBG Discussion",
      href: "https://t.me/+Xpdv7ztBFFc1MGVh",
      unreadCount: 3
    });

    await app.close();
  });

  it("supports an injected async discussion state service", async () => {
    const app = buildApp({
      discussionState: {
        getStatus: async (studentId) => ({
          label: "PBG Discussion",
          href: "https://t.me/+Xpdv7ztBFFc1MGVh",
          unreadCount: studentId === "00000000-0000-4000-8000-000000000101" ? 7 : 0
        }),
        markSeen: async () => ({
          ok: true,
          unreadCount: 0
        })
      }
    });

    const response = await app.inject({
      method: "GET",
      url: API_ROUTES.discussionStatus,
      headers: await loginHeaders(app)
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({
      label: "PBG Discussion",
      href: "https://t.me/+Xpdv7ztBFFc1MGVh",
      unreadCount: 7
    });

    await app.close();
  });

  it("marks the discussion badge seen for the authenticated student", async () => {
    const app = buildApp();
    const headers = await loginHeaders(app);

    const response = await app.inject({
      method: "POST",
      url: API_ROUTES.discussionSeen,
      headers
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({
      ok: true,
      unreadCount: 0
    });

    const nextStatus = await app.inject({
      method: "GET",
      url: API_ROUTES.discussionStatus,
      headers
    });

    expect(nextStatus.json()).toMatchObject({
      unreadCount: 0
    });

    await app.close();
  });

  it("rejects unauthenticated discussion seen requests", async () => {
    const app = buildApp();

    const response = await app.inject({
      method: "POST",
      url: API_ROUTES.discussionSeen
    });

    expect(response.statusCode).toBe(401);
    expect(response.json()).toEqual({
      error: "Missing or invalid bearer token"
    });

    await app.close();
  });
});
