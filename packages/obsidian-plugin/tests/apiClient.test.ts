import { describe, expect, it } from "vitest";
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
});
