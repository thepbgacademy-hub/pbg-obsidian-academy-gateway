export interface PbgAcademyGatewaySettings {
  gatewayBaseUrl: string;
  accessToken?: string;
  refreshToken?: string;
}

export const DEFAULT_PLUGIN_SETTINGS: PbgAcademyGatewaySettings = {
  gatewayBaseUrl: "http://localhost:8787"
};

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
    refreshToken: typeof value?.refreshToken === "string" ? value.refreshToken : undefined
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
