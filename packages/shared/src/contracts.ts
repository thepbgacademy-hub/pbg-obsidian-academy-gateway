export const WORKFLOW_SLUGS = {
  assignmentCoach: "assignment-coach",
  courseCompanion: "course-companion",
  progressReviewer: "progress-reviewer"
} as const;

export type WorkflowSlug = (typeof WORKFLOW_SLUGS)[keyof typeof WORKFLOW_SLUGS];
