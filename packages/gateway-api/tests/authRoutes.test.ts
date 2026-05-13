import { describe, expect, it } from "vitest";
import { API_ROUTES } from "@pbg/shared/contracts";
import { buildApp, POC_REFRESH_TOKEN, type AuthService } from "../src/app.js";

async function login(app = buildApp()): Promise<{ accessToken: string; refreshToken: string }> {
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

  return response.json<{ accessToken: string; refreshToken: string }>();
}

describe("auth routes", () => {
  it("logs in through an injected auth service", async () => {
    const authService: AuthService = {
      login: async (input) => ({
        accessToken: "injected-access-token",
        refreshToken: "injected-refresh-token",
        student: {
          studentId: "00000000-0000-4000-8000-000000000101",
          displayName: "PBG Test Student",
          tier: "pro",
          standingGood: true,
          creditBalance: 250
        },
        device: {
          deviceId: "00000000-0000-4000-8000-000000000301",
          vaultId: input.vaultId,
          status: "active"
        }
      })
    };
    const app = buildApp({ authService });

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
      accessToken: "injected-access-token",
      refreshToken: "injected-refresh-token",
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
    });

    await app.close();
  });

  it("returns 401 when the injected auth service rejects credentials", async () => {
    const authService: AuthService = {
      login: async () => null
    };
    const app = buildApp({ authService });

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

  it("rejects malformed login requests before auth service execution", async () => {
    let authServiceCalled = false;
    const authService: AuthService = {
      login: async () => {
        authServiceCalled = true;
        return null;
      }
    };
    const app = buildApp({ authService });

    const response = await app.inject({
      method: "POST",
      url: API_ROUTES.authLogin,
      payload: {}
    });

    expect(response.statusCode).toBe(400);
    expect(response.json()).toEqual({
      error: "Invalid login request"
    });
    expect(authServiceCalled).toBe(false);

    await app.close();
  });

  it("refreshes using the refresh token returned by seeded login", async () => {
    const app = buildApp();

    const loginResponse = await app.inject({
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
    const loginBody = loginResponse.json<{ refreshToken: string }>();

    expect(loginResponse.statusCode).toBe(200);
    expect(loginBody.refreshToken).toBe(POC_REFRESH_TOKEN);

    const response = await app.inject({
      method: "POST",
      url: API_ROUTES.authRefresh,
      payload: {
        refreshToken: loginBody.refreshToken
      }
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({
      accessToken: "short-lived-token"
    });

    await app.close();
  });

  it("rejects unknown refresh tokens", async () => {
    const app = buildApp();

    const response = await app.inject({
      method: "POST",
      url: API_ROUTES.authRefresh,
      payload: {
        refreshToken: "wrong-refresh-token"
      }
    });

    expect(response.statusCode).toBe(401);
    expect(response.json()).toEqual({
      error: "Invalid refresh token"
    });

    await app.close();
  });

  it("revokes the current POC session on logout", async () => {
    const app = buildApp();
    const tokens = await login(app);

    const response = await app.inject({
      method: "POST",
      url: API_ROUTES.authLogout,
      headers: {
        authorization: `Bearer ${tokens.accessToken}`
      },
      payload: {
        refreshToken: tokens.refreshToken
      }
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({
      ok: true
    });

    const refreshResponse = await app.inject({
      method: "POST",
      url: API_ROUTES.authRefresh,
      payload: {
        refreshToken: tokens.refreshToken
      }
    });
    expect(refreshResponse.statusCode).toBe(401);

    const dashboardResponse = await app.inject({
      method: "GET",
      url: API_ROUTES.dashboardMe,
      headers: {
        authorization: `Bearer ${tokens.accessToken}`
      }
    });
    expect(dashboardResponse.statusCode).toBe(401);

    await app.close();
  });

  it("requires auth and derives device registration student identity from the session", async () => {
    const app = buildApp();
    const tokens = await login(app);

    const response = await app.inject({
      method: "POST",
      url: API_ROUTES.deviceRegister,
      headers: {
        authorization: `Bearer ${tokens.accessToken}`
      },
      payload: {
        studentId: "attacker-controlled-student-id",
        vaultId: "sha256-vault-id",
        deviceFingerprint: "sha256-device-fingerprint",
        pluginVersion: "0.1.0"
      }
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({
      device: {
        deviceId: "poc-active-device",
        studentId: "00000000-0000-4000-8000-000000000101",
        vaultId: "sha256-vault-id",
        deviceFingerprint: "sha256-device-fingerprint",
        pluginVersion: "0.1.0",
        status: "active"
      },
      oneActiveDevice: {
        enforced: false,
        semantics: "poc-stub"
      }
    });

    await app.close();
  });

  it("rejects unauthenticated device registration", async () => {
    const app = buildApp();

    const response = await app.inject({
      method: "POST",
      url: API_ROUTES.deviceRegister,
      payload: {
        studentId: "00000000-0000-4000-8000-000000000101",
        vaultId: "sha256-vault-id",
        deviceFingerprint: "sha256-device-fingerprint",
        pluginVersion: "0.1.0"
      }
    });

    expect(response.statusCode).toBe(401);
    expect(response.json()).toEqual({
      error: "Missing or invalid bearer token"
    });

    await app.close();
  });

  it("rejects malformed authenticated device registration requests", async () => {
    const app = buildApp();
    const tokens = await login(app);

    const response = await app.inject({
      method: "POST",
      url: API_ROUTES.deviceRegister,
      headers: {
        authorization: `Bearer ${tokens.accessToken}`
      },
      payload: {}
    });

    expect(response.statusCode).toBe(400);
    expect(response.json()).toEqual({
      error: "Invalid device registration request"
    });

    await app.close();
  });

  it("captures auth failure audit events without secrets", async () => {
    const events: unknown[] = [];
    const app = buildApp({
      auditSink: {
        capture: async (event) => {
          events.push(event);
        }
      }
    });

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
    expect(JSON.stringify(events)).toContain("auth.login.denied");
    expect(JSON.stringify(events)).not.toContain("wrong-password");

    await app.close();
  });
});
