import { describe, expect, it } from "vitest";
import {
  DEFAULT_PLUGIN_SETTINGS,
  normalizeDashboardPalette,
  normalizeGatewayBaseUrl,
  normalizePluginSettings,
  updateDashboardPalette,
  updateGatewayBaseUrl,
  updateSessionTokens
} from "../src/settings.js";

describe("plugin settings", () => {
  it("defaults the gateway base URL to the local gateway", () => {
    expect(normalizePluginSettings({})).toEqual(DEFAULT_PLUGIN_SETTINGS);
  });

  it("trims and removes trailing slashes from gateway base URLs", () => {
    expect(normalizeGatewayBaseUrl(" http://localhost:8788/// ")).toBe("http://localhost:8788");
  });

  it("falls back to the default gateway base URL for blank or invalid values", () => {
    expect(normalizeGatewayBaseUrl("   ")).toBe(DEFAULT_PLUGIN_SETTINGS.gatewayBaseUrl);
    expect(normalizeGatewayBaseUrl("not a url")).toBe(DEFAULT_PLUGIN_SETTINGS.gatewayBaseUrl);
  });

  it("preserves optional session tokens", () => {
    expect(
      normalizePluginSettings({
        gatewayBaseUrl: "http://localhost:8788",
        accessToken: "access-token",
        refreshToken: "refresh-token",
        academyUsername: "pbg_test_student",
        dashboardPalette: "obsidian-native"
      })
    ).toEqual({
      gatewayBaseUrl: "http://localhost:8788",
      accessToken: "access-token",
      refreshToken: "refresh-token",
      academyUsername: "pbg_test_student",
      dashboardPalette: "obsidian-native"
    });
  });

  it("preserves optional session tokens when updating the gateway base URL", () => {
    expect(
      updateGatewayBaseUrl(
        {
          gatewayBaseUrl: "http://localhost:8787",
          accessToken: "access-token",
          refreshToken: "refresh-token",
          academyUsername: "pbg_test_student",
          dashboardPalette: "obsidian-native"
        },
        " http://localhost:8788/// "
      )
    ).toEqual({
        gatewayBaseUrl: "http://localhost:8788",
        accessToken: "access-token",
        refreshToken: "refresh-token",
        academyUsername: "pbg_test_student",
        dashboardPalette: "obsidian-native"
      });
  });

  it("updates session tokens without losing the normalized gateway URL", () => {
    expect(
      updateSessionTokens(
        {
          gatewayBaseUrl: "http://localhost:8788",
          academyUsername: "pbg_test_student",
          dashboardPalette: "hermes-teal"
        },
        {
          accessToken: "access-token",
          refreshToken: "refresh-token",
          academyUsername: "pbg_test_student"
        }
      )
    ).toEqual({
        gatewayBaseUrl: "http://localhost:8788",
        accessToken: "access-token",
        refreshToken: "refresh-token",
        academyUsername: "pbg_test_student",
        dashboardPalette: "hermes-teal"
      });
  });

  it("defaults the dashboard palette to PBG Teal", () => {
    expect(normalizeDashboardPalette(undefined)).toBe("hermes-teal");
    expect(normalizeDashboardPalette("something-else")).toBe("hermes-teal");
  });

  it("updates the dashboard palette without losing session state", () => {
    expect(
      updateDashboardPalette(
        {
          gatewayBaseUrl: "http://localhost:8788",
          accessToken: "access-token",
          refreshToken: "refresh-token",
          academyUsername: "pbg_test_student",
          dashboardPalette: "hermes-teal"
        },
        "obsidian-native"
      )
    ).toEqual({
      gatewayBaseUrl: "http://localhost:8788",
      accessToken: "access-token",
      refreshToken: "refresh-token",
      academyUsername: "pbg_test_student",
      dashboardPalette: "obsidian-native"
    });
  });
});
