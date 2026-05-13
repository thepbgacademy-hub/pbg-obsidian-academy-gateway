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

export interface LocalPbgFileSnapshot {
  path: string;
  body?: string;
}

export interface LocalPbgAssignmentSummary {
  path: string;
  title: string;
  taskCount: number;
  completedTaskCount: number;
  status: "not-started" | "in-progress" | "complete";
}

export interface LocalPbgTodoItem {
  path: string;
  text: string;
}

export interface LocalPbgCurrentFocus {
  assignmentPath: string;
  title: string;
  nextTodo?: string;
  progressLabel: string;
}

export interface LocalPbgHeatmapItem {
  label: string;
  count: number;
  intensity: number;
}

export interface LocalPbgDashboardMetrics extends LocalPbgMetrics {
  academyTaggedFileCount: number;
  taskCount: number;
  completedTaskCount: number;
  openTaskCount: number;
}

export interface LocalPbgDashboardState {
  metrics: LocalPbgDashboardMetrics;
  currentFocus?: LocalPbgCurrentFocus;
  assignments: LocalPbgAssignmentSummary[];
  todos: LocalPbgTodoItem[];
  heatmap: LocalPbgHeatmapItem[];
}

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

export function computeLocalPbgDashboardState(files: readonly LocalPbgFileSnapshot[]): LocalPbgDashboardState {
  const scopedMarkdownFiles = files
    .map((file) => ({ ...file, path: normalizeVaultPath(file.path) }))
    .filter((file) => isPbgScopedPath(file.path) && file.path.endsWith(".md"));

  const baseMetrics = computeLocalPbgMetrics(scopedMarkdownFiles.map((file) => file.path));
  const assignments: LocalPbgAssignmentSummary[] = [];
  const todos: LocalPbgTodoItem[] = [];
  let academyTaggedFileCount = 0;
  let taskCount = 0;
  let completedTaskCount = 0;

  for (const file of scopedMarkdownFiles) {
    const body = file.body ?? "";

    if (hasAcademyTag(body)) {
      academyTaggedFileCount += 1;
    }

    if (!file.path.startsWith("PBG/Assignments/")) {
      continue;
    }

    const taskStats = collectMarkdownTasks(body);
    taskCount += taskStats.taskCount;
    completedTaskCount += taskStats.completedTaskCount;
    todos.push(...taskStats.openTasks.map((text) => ({ path: file.path, text })));
    assignments.push({
      path: file.path,
      title: getDashboardTitle(file.path, body),
      taskCount: taskStats.taskCount,
      completedTaskCount: taskStats.completedTaskCount,
      status: getAssignmentStatus(taskStats.taskCount, taskStats.completedTaskCount)
    });
  }

  assignments.sort((left, right) => left.path.localeCompare(right.path));

  const metrics: LocalPbgDashboardMetrics = {
    courseFileCount: baseMetrics.courseFileCount,
    assignmentFileCount: baseMetrics.assignmentFileCount,
    workflowResultFileCount: baseMetrics.workflowResultFileCount,
    academyTaggedFileCount,
    taskCount,
    completedTaskCount,
    openTaskCount: taskCount - completedTaskCount
  };

  return {
    metrics,
    currentFocus: getCurrentFocus(assignments, todos),
    assignments,
    todos,
    heatmap: buildHeatmap(metrics)
  };
}

function collectMarkdownTasks(markdown: string): {
  taskCount: number;
  completedTaskCount: number;
  openTasks: string[];
} {
  const taskPattern = /^\s*[-*]\s+\[([ xX])\]\s+(.+)$/gm;
  let taskCount = 0;
  let completedTaskCount = 0;
  const openTasks: string[] = [];
  let match: RegExpExecArray | null;

  while ((match = taskPattern.exec(markdown)) !== null) {
    taskCount += 1;
    const marker = match[1] ?? " ";
    const text = (match[2] ?? "").trim();

    if (marker.toLowerCase() === "x") {
      completedTaskCount += 1;
    } else if (text) {
      openTasks.push(text);
    }
  }

  return { taskCount, completedTaskCount, openTasks };
}

function hasAcademyTag(markdown: string): boolean {
  return /(^|\s)#academy(\s|$)/.test(markdown) || /(^|\n)\s*-\s*academy\s*($|\n)/.test(markdown) || /tags:\s*(\[)?academy/i.test(markdown);
}

function getDashboardTitle(path: string, markdown: string): string {
  const heading = markdown.match(/^#\s+(.+)$/m)?.[1]?.trim();
  if (heading) {
    return heading;
  }

  const fileName = path.split("/").at(-1)?.replace(/\.md$/i, "") ?? path;
  return fileName
    .split("-")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function getAssignmentStatus(taskCount: number, completedTaskCount: number): LocalPbgAssignmentSummary["status"] {
  if (taskCount > 0 && taskCount === completedTaskCount) {
    return "complete";
  }

  if (completedTaskCount > 0 || taskCount > 0) {
    return "in-progress";
  }

  return "not-started";
}

function getCurrentFocus(
  assignments: readonly LocalPbgAssignmentSummary[],
  todos: readonly LocalPbgTodoItem[]
): LocalPbgCurrentFocus | undefined {
  const focus = assignments.find((assignment) => assignment.status !== "complete") ?? assignments[0];
  if (!focus) {
    return undefined;
  }

  const nextTodo = todos.find((todo) => todo.path === focus.path)?.text;
  return {
    assignmentPath: focus.path,
    title: focus.title,
    nextTodo,
    progressLabel: `${focus.completedTaskCount} of ${focus.taskCount} tasks complete`
  };
}

function buildHeatmap(metrics: LocalPbgDashboardMetrics): LocalPbgHeatmapItem[] {
  return [
    { label: "Courses", count: metrics.courseFileCount },
    { label: "Assignments", count: metrics.assignmentFileCount },
    { label: "Workflow Results", count: metrics.workflowResultFileCount }
  ].map((item) => ({
    ...item,
    intensity: item.count === 0 ? 0 : 1
  }));
}
