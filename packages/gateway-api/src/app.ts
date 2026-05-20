import Fastify, { type FastifyInstance, type FastifyReply, type FastifyRequest } from "fastify";
import {
  API_ROUTES,
  type CoachPanelStatusPayload,
  type CoachRunRequest,
  type CoachRunResponse,
  type DashboardAnnouncementsPayload,
  type DiscussionSeenResponse,
  type DiscussionStatusPayload,
  type ProviderOption,
  type ReportArtifact
} from "@pbg/shared/contracts";
import { createPocCourseManifest } from "@pbg/shared/courseManifest";
import type {
  AssignmentCoachPreviewResponse,
  AssignmentCoachRunRequest,
  AssignmentCoachRunResponse
} from "@pbg/shared/workflowContracts";
import type { AuthenticatedStudent } from "./auth/passwordAuth.js";

const POC_ASSIGNMENT_COACH_RUN_ID = "poc-assignment-coach-run";
const ASSIGNMENT_PATH_PREFIX = "PBG/Assignments/";
const POC_STUDENT_ID = "00000000-0000-4000-8000-000000000101";
const POC_USERNAME = "pbg_test_student";
const POC_PASSWORD = "pbg-test-password";
export const POC_REFRESH_TOKEN = "poc-refresh-token";
const POC_ACCESS_TOKEN = "short-lived-token";
const POC_DISCUSSION_LABEL = "PBG Discussion";
const POC_DISCUSSION_HREF = "https://t.me/+Xpdv7ztBFFc1MGVh";
const POC_DISCUSSION_LATEST_MARKER = 3;
const POC_PROVIDER_OPTIONS: ProviderOption[] = [
  { id: "openai", label: "OpenAI", recommended: true, connected: true },
  { id: "anthropic", label: "Anthropic API", recommended: false, connected: false },
  { id: "grok", label: "Grok API", recommended: false, connected: false },
  { id: "gemini", label: "Gemini API", recommended: false, connected: false },
  { id: "openrouter", label: "OpenRouter", recommended: false, connected: false }
];
const POC_DASHBOARD_ANNOUNCEMENTS: DashboardAnnouncementsPayload = {
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
};

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
  studentId?: string;
  vaultId: string;
  deviceFingerprint: string;
  pluginVersion: string;
};

export interface AuthService {
  login(input: LoginRequest): Promise<LoginResponse | null>;
}

export interface AuthenticatedGatewaySession {
  accessToken: string;
  student: AuthenticatedStudent;
}

export interface SessionService {
  createSession(login: LoginResponse): Promise<void>;
  authenticate(accessToken: string): Promise<AuthenticatedGatewaySession | null>;
  refresh(refreshToken: string): Promise<{ accessToken: string } | null>;
  revoke(input: { accessToken: string; refreshToken: string }): Promise<void>;
}

export interface DeviceRegistrationService {
  registerDevice(input: Required<DeviceRegisterRequest>): Promise<{
    deviceId: string;
    vaultId: string;
    status: "active";
  }>;
}

export interface WorkflowAuthorizationDenied {
  allowed: false;
  statusCode: 402 | 403;
  reason: string;
  message: string;
}

export interface WorkflowAuthorizationAllowed {
  allowed: true;
  creditCost: number;
}

export interface WorkflowGuard {
  authorize(input: {
    student: AuthenticatedStudent;
    workflowSlug: "assignment-coach";
    creditCost: number;
  }): Promise<WorkflowAuthorizationAllowed | WorkflowAuthorizationDenied>;
}

export interface AuditEvent {
  type: string;
  route: string;
  studentId?: string;
  reason?: string;
  statusCode?: number;
  username?: string;
}

export interface AuditSink {
  capture(event: AuditEvent): Promise<void> | void;
}

export interface DiscussionStateService {
  getStatus(studentId: string): Promise<DiscussionStatusPayload> | DiscussionStatusPayload;
  markSeen(studentId: string): Promise<DiscussionSeenResponse> | DiscussionSeenResponse;
}

export interface CoachStateService {
  getStatus(student: AuthenticatedStudent): Promise<CoachPanelStatusPayload> | CoachPanelStatusPayload;
  run(input: {
    student: AuthenticatedStudent;
    request: CoachRunRequest;
  }): Promise<CoachRunResponse> | CoachRunResponse;
}

export interface AppServices {
  authService?: AuthService;
  sessionService?: SessionService;
  deviceRegistrationService?: DeviceRegistrationService;
  discussionState?: DiscussionStateService;
  coachState?: CoachStateService;
  workflowGuard?: WorkflowGuard;
  auditSink?: AuditSink;
  rateLimit?: {
    max: number;
    windowMs: number;
  };
}

function resolveCoachCredits(mode: CoachRunRequest["mode"], variant: CoachRunRequest["variant"]): number {
  if (mode === "coach") {
    return 2;
  }

  if (mode === "research") {
    return variant === "deep" ? 8 : 5;
  }

  return variant === "expanded-pdf-md" ? 15 : 10;
}

function getCoachThreadPath(contextType: CoachRunRequest["contextType"], contextId: string): string {
  return `PBG/Coach Threads/${contextType}-${contextId}.md`;
}

function buildCoachReportArtifacts(contextId: string, variant: CoachRunRequest["variant"]): ReportArtifact[] {
  if (variant === "expanded-pdf-md") {
    return [
      {
        kind: "expanded-pdf-md",
        path: `PBG/Reports/${contextId}-expanded-report.pdf`
      },
      {
        kind: "markdown-companion",
        path: `PBG/Reports/${contextId}-expanded-report.md`
      }
    ];
  }

  return [
    {
      kind: "basic-pdf",
      path: `PBG/Reports/${contextId}-basic-report.pdf`
    }
  ];
}

function createPocCoachState(): CoachStateService {
  return {
    getStatus: (student) => ({
      providerOptions: POC_PROVIDER_OPTIONS,
      selectedProviderId: "openai",
      creditBalance: student.creditBalance,
      contextLabel: "Context: Assignment + related academy materials",
      currentThreadId: "assignment:connect-first-workflow",
      blockingReason: null
    }),
    run: ({ request }) => ({
      mode: request.mode,
      variant: request.variant,
      creditsDebited: resolveCoachCredits(request.mode, request.variant),
      message: request.mode === "report" ? "Report generation complete." : "Here is your academy coaching result.",
      threadPath: getCoachThreadPath(request.contextType, request.contextId),
      reportArtifacts: request.mode === "report" ? buildCoachReportArtifacts(request.contextId, request.variant) : []
    })
  };
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

function createInMemoryPocSessionService(): SessionService {
  const sessionsByAccessToken = new Map<string, AuthenticatedGatewaySession>();
  const accessTokenByRefreshToken = new Map<string, string>();
  const revokedRefreshTokens = new Set<string>();
  const seededStudent: AuthenticatedStudent = {
    studentId: POC_STUDENT_ID,
    displayName: "PBG Test Student",
    tier: "pro",
    standingGood: true,
    creditBalance: 250
  };

  sessionsByAccessToken.set(POC_ACCESS_TOKEN, {
    accessToken: POC_ACCESS_TOKEN,
    student: seededStudent
  });
  accessTokenByRefreshToken.set(POC_REFRESH_TOKEN, POC_ACCESS_TOKEN);

  return {
    createSession: async (login) => {
      sessionsByAccessToken.set(login.accessToken, {
        accessToken: login.accessToken,
        student: login.student
      });
      accessTokenByRefreshToken.set(login.refreshToken, login.accessToken);
      revokedRefreshTokens.delete(login.refreshToken);
    },
    authenticate: async (accessToken) => sessionsByAccessToken.get(accessToken) ?? null,
    refresh: async (refreshToken) => {
      if (revokedRefreshTokens.has(refreshToken)) {
        return null;
      }

      const accessToken = accessTokenByRefreshToken.get(refreshToken);
      if (!accessToken) {
        return null;
      }

      const session = sessionsByAccessToken.get(accessToken);
      if (!session) {
        return null;
      }

      sessionsByAccessToken.set(accessToken, session);
      return { accessToken };
    },
    revoke: async ({ accessToken, refreshToken }) => {
      sessionsByAccessToken.delete(accessToken);
      accessTokenByRefreshToken.delete(refreshToken);
      revokedRefreshTokens.add(refreshToken);
    }
  };
}

function createPocDeviceRegistrationService(): DeviceRegistrationService {
  return {
    registerDevice: async (input) => ({
      deviceId: "poc-active-device",
      vaultId: input.vaultId,
      status: "active"
    })
  };
}

function createPocWorkflowGuard(): WorkflowGuard {
  return {
    authorize: async ({ student, creditCost }) => {
      if (!student.standingGood) {
        return {
          allowed: false,
          statusCode: 403,
          reason: "student_not_in_good_standing",
          message: "Student is not in good standing"
        };
      }

      if (student.creditBalance < creditCost) {
        return {
          allowed: false,
          statusCode: 402,
          reason: "insufficient_credits",
          message: "Insufficient credits"
        };
      }

      return {
        allowed: true,
        creditCost
      };
    }
  };
}

function createPocDiscussionState(): DiscussionStateService {
  const seenMarkerByStudentId = new Map<string, number>();

  return {
    getStatus: (studentId) => {
      const seenMarker = seenMarkerByStudentId.get(studentId) ?? 0;

      return {
        label: POC_DISCUSSION_LABEL,
        href: POC_DISCUSSION_HREF,
        unreadCount: Math.max(POC_DISCUSSION_LATEST_MARKER - seenMarker, 0)
      };
    },
    markSeen: (studentId) => {
      seenMarkerByStudentId.set(studentId, POC_DISCUSSION_LATEST_MARKER);

      return {
        ok: true,
        unreadCount: 0
      };
    }
  };
}

type RemoteDiscussionConfig = {
  statusUrl: string;
  seenUrl: string;
};

function getRemoteDiscussionConfig(env: NodeJS.ProcessEnv): RemoteDiscussionConfig | null {
  const statusUrl = env.PBG_DISCUSSION_STATUS_URL?.trim();
  const seenUrl = env.PBG_DISCUSSION_SEEN_URL?.trim();

  if (!statusUrl || !seenUrl) {
    return null;
  }

  return { statusUrl, seenUrl };
}

function createRemoteDiscussionState(config: RemoteDiscussionConfig): DiscussionStateService {
  return {
    getStatus: async (studentId) => {
      const url = new URL(config.statusUrl);
      url.searchParams.set("studentId", studentId);

      const response = await fetch(url, {
        headers: {
          accept: "application/json"
        }
      });

      if (!response.ok) {
        throw new Error(`Discussion status request failed with ${response.status}`);
      }

      return (await response.json()) as DiscussionStatusPayload;
    },
    markSeen: async (studentId) => {
      const response = await fetch(config.seenUrl, {
        method: "POST",
        headers: {
          accept: "application/json",
          "content-type": "application/json"
        },
        body: JSON.stringify({ studentId })
      });

      if (!response.ok) {
        throw new Error(`Discussion seen request failed with ${response.status}`);
      }

      return (await response.json()) as DiscussionSeenResponse;
    }
  };
}

export function buildApp(services: AppServices = {}): FastifyInstance {
  const app = Fastify({
    logger: false
  });
  const authService = services.authService ?? createSeededPocAuthService();
  const sessionService = services.sessionService ?? createInMemoryPocSessionService();
  const deviceRegistrationService = services.deviceRegistrationService ?? createPocDeviceRegistrationService();
  const workflowGuard = services.workflowGuard ?? createPocWorkflowGuard();
  const remoteDiscussionConfig = getRemoteDiscussionConfig(process.env);
  const discussionState =
    services.discussionState ??
    (remoteDiscussionConfig
      ? createRemoteDiscussionState(remoteDiscussionConfig)
      : createPocDiscussionState());
  const coachState = services.coachState ?? createPocCoachState();
  const auditSink = services.auditSink;
  const rateLimitBuckets = new Map<string, { count: number; resetAt: number }>();

  async function captureAudit(event: AuditEvent): Promise<void> {
    await auditSink?.capture(event);
  }

  app.addHook("onSend", async (_request, reply, payload) => {
    reply.header("Access-Control-Allow-Origin", "*");
    reply.header("Access-Control-Allow-Headers", "authorization, content-type");
    reply.header("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    return payload;
  });

  app.options("/*", async (_request, reply) => {
    await reply.code(204).send();
  });

  app.addHook("onRequest", async (request, reply) => {
    if (!services.rateLimit) {
      return;
    }

    const routeKey = `${request.ip}:${request.method}:${request.url.split("?")[0]}`;
    const now = Date.now();
    const bucket = rateLimitBuckets.get(routeKey);
    if (!bucket || bucket.resetAt <= now) {
      rateLimitBuckets.set(routeKey, {
        count: 1,
        resetAt: now + services.rateLimit.windowMs
      });
      return;
    }

    bucket.count += 1;
    if (bucket.count > services.rateLimit.max) {
      await reply.code(429).send({
        error: "Rate limit exceeded"
      });
    }
  });

  async function authenticate(request: FastifyRequest): Promise<AuthenticatedGatewaySession | null> {
    const authorization = request.headers.authorization;
    if (!authorization?.startsWith("Bearer ")) {
      return null;
    }

    return sessionService.authenticate(authorization.slice("Bearer ".length));
  }

  async function requireAuth(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    const session = await authenticate(request);
    if (!session) {
      await captureAudit({
        type: "auth.bearer.denied",
        route: request.url,
        statusCode: 401
      });
      await reply.code(401).send({
        error: "Missing or invalid bearer token"
      });
      return;
    }

    request.authSession = session;
  }

  app.post<{ Body: LoginRequest }>(API_ROUTES.authLogin, async (request, reply) => {
    if (!isLoginRequest(request.body)) {
      return reply.code(400).send({
        error: "Invalid login request"
      });
    }

    const result = await authService.login(request.body);

    if (!result) {
      await captureAudit({
        type: "auth.login.denied",
        route: API_ROUTES.authLogin,
        statusCode: 401,
        username: typeof request.body?.username === "string" ? request.body.username : undefined
      });
      return reply.code(401).send({
        error: "Invalid username or password"
      });
    }

    await sessionService.createSession(result);
    return result;
  });

  app.post<{ Body: RefreshRequest }>(API_ROUTES.authRefresh, async (request, reply) => {
    const result = await sessionService.refresh(request.body.refreshToken);
    if (!result) {
      return reply.code(401).send({
        error: "Invalid refresh token"
      });
    }

    return result;
  });

  app.post<{ Body: RefreshRequest }>(API_ROUTES.authLogout, { preHandler: requireAuth }, async (request) => {
    const accessToken = request.authSession.accessToken;
    await sessionService.revoke({
      accessToken,
      refreshToken: request.body.refreshToken
    });

    return {
      ok: true
    };
  });

  app.post<{ Body: DeviceRegisterRequest }>(
    API_ROUTES.deviceRegister,
    { preHandler: requireAuth },
    async (request, reply) => {
      if (!isDeviceRegisterRequest(request.body)) {
        return reply.code(400).send({
          error: "Invalid device registration request"
        });
      }

      const studentId = request.authSession.student.studentId;
      const input = {
        studentId,
        vaultId: request.body.vaultId,
        deviceFingerprint: request.body.deviceFingerprint,
        pluginVersion: request.body.pluginVersion
      };
      const device = await deviceRegistrationService.registerDevice(input);

      return {
        device: {
          ...device,
          studentId,
          deviceFingerprint: input.deviceFingerprint,
          pluginVersion: input.pluginVersion
        },
        oneActiveDevice: {
          enforced: false,
          semantics: "poc-stub"
        }
      };
    }
  );

  app.get(API_ROUTES.dashboardMe, { preHandler: requireAuth }, async (request) => ({
    student: {
      studentId: request.authSession.student.studentId,
      tier: request.authSession.student.tier,
      standingGood: request.authSession.student.standingGood,
      creditBalance: request.authSession.student.creditBalance
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

  app.get(API_ROUTES.dashboardAnnouncements, { preHandler: requireAuth }, async () => POC_DASHBOARD_ANNOUNCEMENTS);

  app.get(API_ROUTES.providerConnections, { preHandler: requireAuth }, async (request) => {
    const status = await coachState.getStatus(request.authSession.student);
    return {
      providerOptions: status.providerOptions,
      selectedProviderId: status.selectedProviderId
    };
  });

  app.get(API_ROUTES.coachStatus, { preHandler: requireAuth }, async (request) =>
    coachState.getStatus(request.authSession.student)
  );

  app.post<{ Body: CoachRunRequest }>(
    API_ROUTES.coachRun,
    { preHandler: requireAuth },
    async (request, reply): Promise<CoachRunResponse | FastifyReply> => {
      if (!isCoachRunRequest(request.body)) {
        return reply.code(400).send({
          error: "Invalid coach request"
        });
      }

      if (!request.body.prompt.trim()) {
        return reply.code(400).send({
          error: "Prompt is required."
        });
      }

      return coachState.run({
        student: request.authSession.student,
        request: request.body
      });
    }
  );

  app.get(API_ROUTES.discussionStatus, { preHandler: requireAuth }, async (request) =>
    discussionState.getStatus(request.authSession.student.studentId)
  );

  app.post(API_ROUTES.discussionSeen, { preHandler: requireAuth }, async (request) =>
    discussionState.markSeen(request.authSession.student.studentId)
  );

  app.get(API_ROUTES.courseManifest, { preHandler: requireAuth }, async () => createPocCourseManifest());

  app.post<{ Body: AssignmentCoachRunRequest }>(
    API_ROUTES.assignmentCoachPreview,
    { preHandler: requireAuth },
    async (request, reply): Promise<AssignmentCoachPreviewResponse | FastifyReply> => {
      if (!isAssignmentCoachRunRequest(request.body)) {
        return reply.code(400).send({
          error: "Invalid Assignment Coach request"
        });
      }

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
      if (!isAssignmentCoachRunRequest(request.body)) {
        return reply.code(400).send({
          error: "Invalid Assignment Coach request"
        });
      }

      const scopeError = getAssignmentScopeError(request.body.assignmentPath);
      if (scopeError) {
        return reply.code(scopeError.statusCode).send({
          error: scopeError.message
        });
      }

      const authorization = await workflowGuard.authorize({
        student: request.authSession.student,
        workflowSlug: "assignment-coach",
        creditCost: 1
      });
      if (!authorization.allowed) {
        await captureAudit({
          type: "workflow.denied",
          route: API_ROUTES.assignmentCoachRun,
          studentId: request.authSession.student.studentId,
          reason: authorization.reason,
          statusCode: authorization.statusCode
        });
        return reply.code(authorization.statusCode).send({
          error: authorization.message
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

declare module "fastify" {
  interface FastifyRequest {
    authSession: AuthenticatedGatewaySession;
  }
}

function isLoginRequest(value: unknown): value is LoginRequest {
  if (!isRecord(value)) {
    return false;
  }

  return (
    isNonEmptyString(value.username) &&
    isNonEmptyString(value.password) &&
    isNonEmptyString(value.vaultId) &&
    isNonEmptyString(value.deviceFingerprint) &&
    isNonEmptyString(value.pluginVersion)
  );
}

function isDeviceRegisterRequest(value: unknown): value is DeviceRegisterRequest {
  if (!isRecord(value)) {
    return false;
  }

  return (
    isNonEmptyString(value.vaultId) &&
    isNonEmptyString(value.deviceFingerprint) &&
    isNonEmptyString(value.pluginVersion)
  );
}

function isAssignmentCoachRunRequest(value: unknown): value is AssignmentCoachRunRequest {
  if (!isRecord(value)) {
    return false;
  }

  if (
    typeof value.assignmentPath !== "string" ||
    typeof value.assignmentTitle !== "string" ||
    typeof value.assignmentBody !== "string" ||
    !Array.isArray(value.relatedContext) ||
    !isRecord(value.localMetadata)
  ) {
    return false;
  }

  const metadata = value.localMetadata;

  return (
    value.relatedContext.every(
      (item) =>
        isRecord(item) &&
        typeof item.path === "string" &&
        typeof item.title === "string" &&
        typeof item.body === "string"
    ) &&
    hasValidTaskCounts(metadata.taskCount, metadata.completedTaskCount) &&
    Array.isArray(metadata.tags) &&
    metadata.tags.every((tag) => typeof tag === "string")
  );
}

function isCoachRunRequest(value: unknown): value is CoachRunRequest {
  if (!isRecord(value)) {
    return false;
  }

  const modeValid = value.mode === "coach" || value.mode === "research" || value.mode === "report";
  const contextTypeValid = value.contextType === "course" || value.contextType === "assignment";
  const promptValid = typeof value.prompt === "string";
  const contextIdValid = typeof value.contextId === "string" && value.contextId.length > 0;
  const variantValid =
    value.variant === null ||
    value.variant === "standard" ||
    value.variant === "deep" ||
    value.variant === "basic-pdf" ||
    value.variant === "expanded-pdf-md";

  return modeValid && contextTypeValid && promptValid && contextIdValid && variantValid;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function hasValidTaskCounts(taskCount: unknown, completedTaskCount: unknown): boolean {
  return (
    Number.isInteger(taskCount) &&
    typeof taskCount === "number" &&
    taskCount >= 0 &&
    Number.isInteger(completedTaskCount) &&
    typeof completedTaskCount === "number" &&
    completedTaskCount >= 0 &&
    completedTaskCount <= taskCount
  );
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
