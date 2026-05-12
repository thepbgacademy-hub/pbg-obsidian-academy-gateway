import type { CourseManifest } from "@pbg/shared/courseManifest";
import { API_ROUTES } from "@pbg/shared/contracts";
import type {
  AssignmentCoachPreviewResponse,
  AssignmentCoachRunRequest,
  AssignmentCoachRunResponse
} from "@pbg/shared/workflowContracts";

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
    private readonly fetchImpl: GatewayFetch = fetch,
    private accessToken?: string
  ) {}

  async getCourseManifest(): Promise<CourseManifest> {
    return this.requestJson<CourseManifest>(API_ROUTES.courseManifest);
  }

  async login(input: LoginRequest): Promise<LoginResponse> {
    const result = await this.requestJson<LoginResponse>(API_ROUTES.authLogin, {
      method: "POST",
      headers: {
        "content-type": "application/json"
      },
      body: JSON.stringify(input)
    });

    this.accessToken = result.accessToken;
    return result;
  }

  async previewAssignmentCoach(payload: AssignmentCoachRunRequest): Promise<AssignmentCoachPreviewResponse> {
    return this.requestJson<AssignmentCoachPreviewResponse>(API_ROUTES.assignmentCoachPreview, {
      method: "POST",
      headers: {
        "content-type": "application/json"
      },
      body: JSON.stringify(payload)
    });
  }

  async runAssignmentCoach(payload: AssignmentCoachRunRequest): Promise<AssignmentCoachRunResponse> {
    return this.requestJson<AssignmentCoachRunResponse>(API_ROUTES.assignmentCoachRun, {
      method: "POST",
      headers: {
        "content-type": "application/json"
      },
      body: JSON.stringify(payload)
    });
  }

  async getWorkflowRun(runId: string): Promise<AssignmentCoachRunResponse> {
    const path = API_ROUTES.workflowRun.replace(":runId", encodeURIComponent(runId));
    return this.requestJson<AssignmentCoachRunResponse>(path);
  }

  private async requestJson<T>(path: string, init?: RequestInit): Promise<T> {
    const requestInit = this.withAuthorization(init);
    const response = await this.fetchImpl(new URL(path, this.gatewayBaseUrl), requestInit);

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

  private withAuthorization(init?: RequestInit): RequestInit | undefined {
    if (!this.accessToken) {
      return init;
    }

    return {
      ...init,
      headers: {
        ...headersToObject(init?.headers),
        authorization: `Bearer ${this.accessToken}`
      }
    };
  }
}

function headersToObject(headers: HeadersInit | undefined): Record<string, string> {
  if (!headers) {
    return {};
  }

  if (headers instanceof Headers) {
    return Object.fromEntries(headers.entries());
  }

  if (Array.isArray(headers)) {
    return Object.fromEntries(headers);
  }

  return headers;
}

export async function getCourseManifest(gatewayBaseUrl: string, accessToken?: string): Promise<CourseManifest> {
  return new PbgGatewayApiClient(gatewayBaseUrl, fetch, accessToken).getCourseManifest();
}
