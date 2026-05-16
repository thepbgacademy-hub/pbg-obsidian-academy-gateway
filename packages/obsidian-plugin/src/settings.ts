export type PbgDashboardPalette = "hermes-teal" | "obsidian-native";

export interface PbgAcademyGatewaySettings {
  gatewayBaseUrl: string;
  accessToken?: string;
  refreshToken?: string;
  academyUsername?: string;
  dashboardPalette: PbgDashboardPalette;
}

export const DEFAULT_PLUGIN_SETTINGS: PbgAcademyGatewaySettings = {
  gatewayBaseUrl: "http://localhost:8787",
  dashboardPalette: "hermes-teal"
};

export function normalizeDashboardPalette(value: unknown): PbgDashboardPalette {
  return value === "obsidian-native" ? "obsidian-native" : DEFAULT_PLUGIN_SETTINGS.dashboardPalette;
}

export function normalizeGatewayBaseUrl(value: unknown): string {
  if (typeof value !== "string") {
    return DEFAULT_PLUGIN_SETTINGS.gatewayBaseUrl;
  }

  const trimmed = value.trim().replace(/\/+$/, "");
  if (!trimmed) {
    return DEFAULT_PLUGIN_SETTINGS.gatewayBaseUrl;
  }

  try {
    return new URL(trimmed).toString().replace(/\/+$/, "");
  } catch {
    return DEFAULT_PLUGIN_SETTINGS.gatewayBaseUrl;
  }
}

export function normalizePluginSettings(value: Partial<PbgAcademyGatewaySettings> | null | undefined): PbgAcademyGatewaySettings {
  return {
    gatewayBaseUrl: normalizeGatewayBaseUrl(value?.gatewayBaseUrl),
    accessToken: typeof value?.accessToken === "string" ? value.accessToken : undefined,
    refreshToken: typeof value?.refreshToken === "string" ? value.refreshToken : undefined,
    academyUsername: typeof value?.academyUsername === "string" ? value.academyUsername : undefined,
    dashboardPalette: normalizeDashboardPalette(value?.dashboardPalette)
  };
}

export function updateGatewayBaseUrl(
  settings: PbgAcademyGatewaySettings,
  gatewayBaseUrl: string
): PbgAcademyGatewaySettings {
  return normalizePluginSettings({
    ...settings,
    gatewayBaseUrl
  });
}

export function updateDashboardPalette(
  settings: PbgAcademyGatewaySettings,
  dashboardPalette: PbgDashboardPalette
): PbgAcademyGatewaySettings {
  return normalizePluginSettings({
    ...settings,
    dashboardPalette
  });
}

export function updateSessionTokens(
  settings: PbgAcademyGatewaySettings,
  input: { accessToken?: string; refreshToken?: string; academyUsername?: string }
): PbgAcademyGatewaySettings {
  return normalizePluginSettings({
    ...settings,
    accessToken: input.accessToken,
    refreshToken: input.refreshToken,
    academyUsername: input.academyUsername ?? settings.academyUsername
  });
}
