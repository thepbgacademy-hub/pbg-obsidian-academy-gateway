import Fastify, { type FastifyInstance } from "fastify";
import { API_ROUTES } from "@pbg/shared/contracts";
import { createPocCourseManifest } from "@pbg/shared/courseManifest";
import type {
  AssignmentCoachRunRequest,
  AssignmentCoachRunResponse
} from "@pbg/shared/workflowContracts";

const POC_ASSIGNMENT_COACH_RUN_ID = "poc-assignment-coach-run";
const POC_STUDENT_ID = "00000000-0000-4000-8000-000000000101";
const POC_USERNAME = "pbg_test_student";
const POC_PASSWORD = "pbg-test-password";

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
        accessToken: "short-lived-token",
        refreshToken: "device-refresh-token",
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

  app.post<{ Body: LoginRequest }>(API_ROUTES.authLogin, async (request, reply) => {
    const result = await authService.login(request.body);

    if (!result) {
      return reply.code(401).send({
        error: "Invalid username or password"
      });
    }

    return result;
  });

  app.get(API_ROUTES.dashboardMe, async () => ({
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

  app.get(API_ROUTES.courseManifest, async () => createPocCourseManifest());

  app.post<{ Body: AssignmentCoachRunRequest }>(
    API_ROUTES.assignmentCoachRun,
    async (request): Promise<AssignmentCoachRunResponse> => {
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

  return app;
}
