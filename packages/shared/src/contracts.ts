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
  dashboardMe: "/api/dashboard/me",
  courseManifest: "/api/courses/manifest",
  assignmentCoachPreview: "/api/workflows/assignment-coach/preview",
  assignmentCoachRun: "/api/workflows/assignment-coach/run",
  workflowRun: "/api/workflows/runs/:runId"
} as const;
