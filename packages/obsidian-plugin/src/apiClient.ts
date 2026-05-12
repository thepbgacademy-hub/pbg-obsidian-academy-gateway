import type { CourseManifest } from "@pbg/shared/courseManifest";
import { API_ROUTES } from "@pbg/shared/contracts";

export interface LoginRequest {
  username: string;
  password: string;
  vaultId: string;
  deviceFingerprint: string;
  pluginVersion: string;
}

export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  student: {
    studentId: string;
    displayName: string;
    tier: string;
    standingGood: boolean;
    creditBalance: number;
  };
  device: {
    deviceId: string;
    vaultId: string;
    status: "active";
  };
}

export type GatewayFetch = typeof fetch;

export class PbgGatewayApiClient {
  constructor(
    private readonly gatewayBaseUrl: string,
    private readonly fetchImpl: GatewayFetch = fetch
  ) {}

  async getCourseManifest(): Promise<CourseManifest> {
    return this.requestJson<CourseManifest>(API_ROUTES.courseManifest);
  }

  async login(input: LoginRequest): Promise<LoginResponse> {
    return this.requestJson<LoginResponse>(API_ROUTES.authLogin, {
      method: "POST",
      headers: {
        "content-type": "application/json"
      },
      body: JSON.stringify(input)
    });
  }

  private async requestJson<T>(path: string, init?: RequestInit): Promise<T> {
    const response = await this.fetchImpl(new URL(path, this.gatewayBaseUrl), init);

    if (!response.ok) {
      let details = "";

      try {
        details = await response.text();
      } catch {
        details = "";
      }

      const suffix = details.trim() ? `: ${details.trim()}` : "";
      throw new Error(`Gateway request failed (${response.status} ${response.statusText})${suffix}`);
    }

    return (await response.json()) as T;
  }
}

export async function getCourseManifest(gatewayBaseUrl: string): Promise<CourseManifest> {
  return new PbgGatewayApiClient(gatewayBaseUrl).getCourseManifest();
}
