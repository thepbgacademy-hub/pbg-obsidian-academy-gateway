export const WORKFLOW_SLUGS = {
  assignmentCoach: "assignment-coach",
  courseCompanion: "course-companion",
  progressReviewer: "progress-reviewer"
} as const;

export type WorkflowSlug = (typeof WORKFLOW_SLUGS)[keyof typeof WORKFLOW_SLUGS];

export const API_ROUTES = {
  authLogin: "/api/auth/login",
  authRefresh: "/api/auth/refresh",
  authLogout: "/api/auth/logout",
  deviceRegister: "/api/devices/register",
  providerConnections: "/api/providers/connections",
  dashboardMe: "/api/dashboard/me",
  dashboardAnnouncements: "/api/dashboard/announcements",
  coachStatus: "/api/coach/status",
  coachRun: "/api/coach/run",
  discussionStatus: "/api/lounge/discussion-status",
  discussionSeen: "/api/lounge/discussion-seen",
  courseManifest: "/api/courses/manifest",
  assignmentCoachPreview: "/api/workflows/assignment-coach/preview",
  assignmentCoachRun: "/api/workflows/assignment-coach/run",
  workflowRun: "/api/workflows/runs/:runId"
} as const;

export interface DashboardAnnouncementItem {
  id: string;
  label: string;
  text: string;
  href: string;
  publishedAt: string;
  expiresAt: string | null;
  isActive: boolean;
}

export interface DashboardAnnouncementsPayload {
  items: DashboardAnnouncementItem[];
}

export interface DiscussionStatusPayload {
  label: string;
  href: string;
  unreadCount: number;
}

export interface DiscussionSeenResponse {
  ok: true;
  unreadCount: number;
}

export type ProviderId = "openai" | "anthropic" | "grok" | "gemini" | "openrouter";
export type CoachMode = "coach" | "research" | "report";
export type ResearchVariant = "standard" | "deep";
export type ReportKind = "basic-pdf" | "expanded-pdf-md";
export type CoachVariant = ResearchVariant | ReportKind | null;
export type CoachContextType = "course" | "assignment";

export interface ProviderOption {
  id: ProviderId;
  label: string;
  recommended: boolean;
  connected: boolean;
}

export interface CoachPanelStatusPayload {
  providerOptions: ProviderOption[];
  selectedProviderId: ProviderId | null;
  creditBalance: number;
  contextLabel: string | null;
  currentThreadId: string | null;
  blockingReason: "missing-provider" | "insufficient-credits" | "missing-context" | null;
}

export interface CoachRunRequest {
  mode: CoachMode;
  variant: CoachVariant;
  prompt: string;
  contextType: CoachContextType;
  contextId: string;
}

export interface ReportArtifact {
  kind: ReportKind | "markdown-companion";
  path: string;
}

export interface CoachRunResponse {
  mode: CoachMode;
  variant: CoachVariant;
  creditsDebited: number;
  message: string;
  threadPath: string;
  reportArtifacts: ReportArtifact[];
}
