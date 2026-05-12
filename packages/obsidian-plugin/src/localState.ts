import { isPbgScopedPath, normalizeVaultPath } from "./vaultScope.js";

export interface LocalPbgMetrics {
  courseFileCount: number;
  assignmentFileCount: number;
  workflowResultFileCount: number;
}

const EMPTY_LOCAL_PBG_METRICS: LocalPbgMetrics = {
  courseFileCount: 0,
  assignmentFileCount: 0,
  workflowResultFileCount: 0
};

export function computeLocalPbgMetrics(paths: readonly string[]): LocalPbgMetrics {
  return paths.reduce<LocalPbgMetrics>((metrics, path) => {
    const normalized = normalizeVaultPath(path);

    if (!isPbgScopedPath(normalized) || !normalized.endsWith(".md")) {
      return metrics;
    }

    if (normalized.startsWith("PBG/Courses/")) {
      metrics.courseFileCount += 1;
    } else if (normalized.startsWith("PBG/Assignments/")) {
      metrics.assignmentFileCount += 1;
    } else if (normalized.startsWith("PBG/Workflow Results/")) {
      metrics.workflowResultFileCount += 1;
    }

    return metrics;
  }, { ...EMPTY_LOCAL_PBG_METRICS });
}

export function formatLocalPbgMetricLabels(metrics: LocalPbgMetrics): string[] {
  return [
    `Course files: ${metrics.courseFileCount}`,
    `Assignment files: ${metrics.assignmentFileCount}`,
    `Workflow result files: ${metrics.workflowResultFileCount}`
  ];
}
