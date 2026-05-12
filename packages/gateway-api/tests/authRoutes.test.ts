import { describe, expect, it } from "vitest";
import { API_ROUTES } from "@pbg/shared/contracts";
import { buildApp, POC_REFRESH_TOKEN, type AuthService } from "../src/app.js";

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

  it("accepts POC logout requests", async () => {
    const app = buildApp();

    const response = await app.inject({
      method: "POST",
      url: API_ROUTES.authLogout,
      payload: {
        refreshToken: POC_REFRESH_TOKEN
      }
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({
      ok: true
    });

    await app.close();
  });

  it("registers an active POC device response with one-active-device stub semantics", async () => {
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
});
