import { describe, expect, it } from "vitest";
import { API_ROUTES } from "@pbg/shared/contracts";
import { buildApp } from "../src/app.js";

describe("dashboard announcement route", () => {
  it("returns active academy announcements for authenticated requests", async () => {
    const app = buildApp();

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

    const response = await app.inject({
      method: "GET",
      url: API_ROUTES.dashboardAnnouncements,
      headers: {
        authorization: `Bearer ${accessToken}`
      }
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({
      items: [
        {
          id: "academy-announcement-orientation",
          label: "Academy Announcement",
          text: "Orientation week resources are now live in your PBG vault.",
          href: "https://github.com/thepbgacademy-hub/pbg-obsidian-academy-gateway",
          publishedAt: "2026-05-15T00:00:00.000Z",
          expiresAt: null,
          isActive: true
        }
      ]
    });

    await app.close();
  });
});
