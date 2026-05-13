import Fastify, { type FastifyInstance, type FastifyReply, type FastifyRequest } from "fastify";
import { API_ROUTES } from "@pbg/shared/contracts";
import { createPocCourseManifest } from "@pbg/shared/courseManifest";
import type {
  AssignmentCoachPreviewResponse,
  AssignmentCoachRunRequest,
  AssignmentCoachRunResponse
} from "@pbg/shared/workflowContracts";

const POC_ASSIGNMENT_COACH_RUN_ID = "poc-assignment-coach-run";
const ASSIGNMENT_PATH_PREFIX = "PBG/Assignments/";
const POC_STUDENT_ID = "00000000-0000-4000-8000-000000000101";
const POC_USERNAME = "pbg_test_student";
const POC_PASSWORD = "pbg-test-password";
export const POC_REFRESH_TOKEN = "poc-refresh-token";
const POC_ACCESS_TOKEN = "short-lived-token";

export type LoginRequest = {
  username: string;
  password: string;
  vaultId: string;
  deviceFingerprint: string;
  pluginVersion: string;
};

export type LoginResponse = {
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
};

export type RefreshRequest = {
  refreshToken: string;
};

export type DeviceRegisterRequest = {
  studentId: string;
  vaultId: string;
  deviceFingerprint: string;
  pluginVersion: string;
};

export interface AuthService {
  login(input: LoginRequest): Promise<LoginResponse | null>;
}

export interface AppServices {
  authService?: AuthService;
}

function createSeededPocAuthService(): AuthService {
  return {
    login: async (input) => {
      if (input.username !== POC_USERNAME || input.password !== POC_PASSWORD) {
        return null;
      }

      return {
        accessToken: POC_ACCESS_TOKEN,
        refreshToken: POC_REFRESH_TOKEN,
        student: {
          studentId: POC_STUDENT_ID,
          displayName: "PBG Test Student",
          tier: "pro",
          standingGood: true,
          creditBalance: 250
        },
        device: {
          deviceId: "uuid",
          vaultId: input.vaultId,
          status: "active"
        }
      };
    }
  };
}

export function buildApp(services: AppServices = {}): FastifyInstance {
  const app = Fastify({
    logger: false
  });
  const authService = services.authService ?? createSeededPocAuthService();
  const validAccessTokens = new Set([POC_ACCESS_TOKEN]);

  function isAuthenticated(request: FastifyRequest): boolean {
    const authorization = request.headers.authorization;
    if (!authorization?.startsWith("Bearer ")) {
      return false;
    }

    return validAccessTokens.has(authorization.slice("Bearer ".length));
  }

  async function requireAuth(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    if (!isAuthenticated(request)) {
      await reply.code(401).send({
        error: "Missing or invalid bearer token"
      });
    }
  }

  app.post<{ Body: LoginRequest }>(API_ROUTES.authLogin, async (request, reply) => {
    const result = await authService.login(request.body);

    if (!result) {
      return reply.code(401).send({
        error: "Invalid username or password"
      });
    }

    validAccessTokens.add(result.accessToken);
    return result;
  });

  app.post<{ Body: RefreshRequest }>(API_ROUTES.authRefresh, async (request, reply) => {
    if (request.body.refreshToken !== POC_REFRESH_TOKEN) {
      return reply.code(401).send({
        error: "Invalid refresh token"
      });
    }

    validAccessTokens.add(POC_ACCESS_TOKEN);

    return {
      accessToken: POC_ACCESS_TOKEN
    };
  });

  app.post(API_ROUTES.authLogout, async () => ({
    ok: true
  }));

  app.post<{ Body: DeviceRegisterRequest }>(API_ROUTES.deviceRegister, async (request) => ({
    device: {
      deviceId: "poc-active-device",
      studentId: request.body.studentId,
      vaultId: request.body.vaultId,
      deviceFingerprint: request.body.deviceFingerprint,
      pluginVersion: request.body.pluginVersion,
      status: "active"
    },
    oneActiveDevice: {
      enforced: false,
      semantics: "poc-stub"
    }
  }));

  app.get(API_ROUTES.dashboardMe, { preHandler: requireAuth }, async () => ({
    student: {
      studentId: POC_STUDENT_ID,
      tier: "pro",
      standingGood: true,
      creditBalance: 250
    },
    workflows: [
      {
        slug: "assignment-coach",
        name: "Assignment Coach",
        enabled: true,
        creditCost: 1
      }
    ],
    courseManifestVersion: "2026-05-12-poc"
  }));

  app.get(API_ROUTES.courseManifest, { preHandler: requireAuth }, async () => createPocCourseManifest());

  app.post<{ Body: AssignmentCoachRunRequest }>(
    API_ROUTES.assignmentCoachPreview,
    { preHandler: requireAuth },
    async (request, reply): Promise<AssignmentCoachPreviewResponse | FastifyReply> => {
      const scopeError = getAssignmentScopeError(request.body.assignmentPath);
      if (scopeError) {
        return reply.code(scopeError.statusCode).send({
          error: scopeError.message
        });
      }

      const contextCount = request.body.relatedContext.length;
      const taskCount = request.body.localMetadata.taskCount;
      const openTaskCount = taskCount - request.body.localMetadata.completedTaskCount;

      return {
        status: "preview",
        assignmentPath: request.body.assignmentPath,
        assignmentTitle: request.body.assignmentTitle,
        summary:
          `Preview prepared for ${request.body.assignmentTitle} with ${contextCount} related context ` +
          `item${contextCount === 1 ? "" : "s"} and ${openTaskCount} open task${openTaskCount === 1 ? "" : "s"}.`,
        contextCount,
        taskCount,
        completedTaskCount: request.body.localMetadata.completedTaskCount
      };
    }
  );

  app.post<{ Body: AssignmentCoachRunRequest }>(
    API_ROUTES.assignmentCoachRun,
    { preHandler: requireAuth },
    async (request, reply): Promise<AssignmentCoachRunResponse | FastifyReply> => {
      const scopeError = getAssignmentScopeError(request.body.assignmentPath);
      if (scopeError) {
        return reply.code(scopeError.statusCode).send({
          error: scopeError.message
        });
      }

      const taskCount = request.body.localMetadata.taskCount;

      return {
        runId: POC_ASSIGNMENT_COACH_RUN_ID,
        status: "completed",
        creditCost: 1,
        result: {
          title: `Assignment Coach: ${request.body.assignmentTitle}`,
          summary: `Reviewed ${taskCount} task${taskCount === 1 ? "" : "s"} for ${request.body.assignmentPath}.`,
          nextSteps: [
            `Open ${request.body.assignmentPath} in Obsidian.`,
            "Complete the next unchecked task.",
            "Sync progress back through the gateway when ready."
          ],
          markdown:
            `# Assignment Coach: ${request.body.assignmentTitle}\n\n` +
            `Run ID: ${POC_ASSIGNMENT_COACH_RUN_ID}\n\n` +
            `Reviewed ${request.body.assignmentPath} with ${taskCount} task${taskCount === 1 ? "" : "s"}.\n\n` +
            "## Next Steps\n\n" +
            `1. Open ${request.body.assignmentPath} in Obsidian.\n` +
            "2. Complete the next unchecked task.\n" +
            "3. Sync progress back through the gateway when ready.\n"
        }
      };
    }
  );

  app.get<{ Params: { runId: string } }>(
    API_ROUTES.workflowRun,
    { preHandler: requireAuth },
    async (request, reply): Promise<AssignmentCoachRunResponse | FastifyReply> => {
      if (request.params.runId !== POC_ASSIGNMENT_COACH_RUN_ID) {
        return reply.code(404).send({
          error: "Workflow run not found"
        });
      }

      return {
        runId: POC_ASSIGNMENT_COACH_RUN_ID,
        status: "completed",
        creditCost: 1,
        result: {
          title: "Assignment Coach: POC Run",
          summary: "Deterministic POC workflow run result.",
          nextSteps: [
            "Open PBG/Assignments/connect-first-workflow.md in Obsidian.",
            "Complete the next unchecked task.",
            "Sync progress back through the gateway when ready."
          ],
          markdown:
            "# Assignment Coach: POC Run\n\n" +
            `Run ID: ${POC_ASSIGNMENT_COACH_RUN_ID}\n\n` +
            "Deterministic POC workflow run result.\n"
        }
      };
    }
  );

  return app;
}

function getAssignmentScopeError(assignmentPath: string): { statusCode: 400 | 403; message: string } | null {
  const normalizedPath = normalizeVaultPath(assignmentPath);

  if (!normalizedPath.endsWith(".md")) {
    return {
      statusCode: 400,
      message: "Assignment Coach only accepts markdown assignment files"
    };
  }

  if (!normalizedPath.startsWith(ASSIGNMENT_PATH_PREFIX)) {
    return {
      statusCode: 403,
      message: "Assignment Coach only accepts files under PBG/Assignments/"
    };
  }

  return null;
}

function normalizeVaultPath(path: string): string {
  const normalized = path.replace(/\\/g, "/").replace(/^\/+/, "");
  const segments = normalized.split("/");

  if (segments.some((segment) => !segment || segment === "." || segment === "..")) {
    return "";
  }

  return segments.join("/");
}
