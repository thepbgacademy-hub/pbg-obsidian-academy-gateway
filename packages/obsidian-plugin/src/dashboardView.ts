import { ItemView } from "obsidian";
import {
  computeLocalPbgDashboardState,
  type LocalPbgDashboardState,
  type LocalPbgFileSnapshot
} from "./localState.js";

export const VIEW_TYPE_PBG_DASHBOARD = "pbg-academy-dashboard";
const SYNC_COURSE_MANIFEST_COMMAND_ID = "pbg-academy-gateway:sync-pbg-course-manifest";
const RUN_ASSIGNMENT_COACH_COMMAND_ID = "pbg-academy-gateway:run-assignment-coach-on-active-note";

export class PbgDashboardView extends ItemView {
  getViewType(): string {
    return VIEW_TYPE_PBG_DASHBOARD;
  }

  getDisplayText(): string {
    return "PBG Academy";
  }

  async onOpen(): Promise<void> {
    const container = this.contentEl;
    const dashboardState = computeLocalPbgDashboardState(await this.getLocalPbgFileSnapshots());

    container.empty();
    container.addClass("pbg-dashboard");
    renderDashboard(container, dashboardState, (commandId) => this.executeCommand(commandId));
  }

  private async getLocalPbgFileSnapshots(): Promise<LocalPbgFileSnapshot[]> {
    const files = this.app.vault.getFiles().filter((file) => file.path.startsWith("PBG/") && file.path.endsWith(".md"));

    return Promise.all(
      files.map(async (file) => ({
        path: file.path,
        body: await this.app.vault.read(file)
      }))
    );
  }

  private executeCommand(commandId: string): void {
    const commandHost = this.app as typeof this.app & {
      commands?: { executeCommandById(commandId: string): boolean };
    };

    commandHost.commands?.executeCommandById(commandId);
  }
}

function renderDashboard(
  container: HTMLElement,
  state: LocalPbgDashboardState,
  executeCommand: (commandId: string) => void
): void {
  const header = container.createDiv({ cls: "pbg-dashboard__header" });
  header.createEl("h1", { text: "PBG Academy" });
  header.createEl("p", { text: "Local academy workspace for PBG course notes, assignments, and workflow results." });

  const focusSection = container.createDiv({ cls: "pbg-dashboard__section pbg-dashboard__focus" });
  focusSection.createEl("h2", { text: "Current Focus" });
  if (state.currentFocus) {
    focusSection.createEl("h3", { text: state.currentFocus.title });
    focusSection.createEl("p", { text: state.currentFocus.progressLabel });
    focusSection.createEl("p", {
      text: state.currentFocus.nextTodo ? `Next: ${state.currentFocus.nextTodo}` : "No open TODOs in this assignment."
    });
    focusSection.createEl("small", { text: state.currentFocus.assignmentPath });
  } else {
    focusSection.createEl("p", { text: "No local assignments found in PBG/Assignments yet." });
  }

  const actionsSection = container.createDiv({ cls: "pbg-dashboard__section" });
  actionsSection.createEl("h2", { text: "Workflow Actions" });
  const actions = actionsSection.createDiv({ cls: "pbg-dashboard__actions" });
  createActionButton(actions, "Sync Course Manifest", () => executeCommand(SYNC_COURSE_MANIFEST_COMMAND_ID));
  createActionButton(actions, "Run Assignment Coach", () => executeCommand(RUN_ASSIGNMENT_COACH_COMMAND_ID));

  const metricsSection = container.createDiv({ cls: "pbg-dashboard__section" });
  metricsSection.createEl("h2", { text: "Local Metrics" });
  const metricsGrid = metricsSection.createDiv({ cls: "pbg-dashboard__metrics" });
  createMetric(metricsGrid, "Courses", state.metrics.courseFileCount);
  createMetric(metricsGrid, "Assignments", state.metrics.assignmentFileCount);
  createMetric(metricsGrid, "Workflow Results", state.metrics.workflowResultFileCount);
  createMetric(metricsGrid, "Open TODOs", state.metrics.openTaskCount);

  const progressSection = container.createDiv({ cls: "pbg-dashboard__section" });
  progressSection.createEl("h2", { text: "Course Progress" });
  const progress = progressSection.createDiv({ cls: "pbg-dashboard__progress" });
  const completionPercent = state.metrics.taskCount === 0 ? 0 : Math.round((state.metrics.completedTaskCount / state.metrics.taskCount) * 100);
  progress.createDiv({ cls: "pbg-dashboard__progress-bar" }).setAttr("style", `width: ${completionPercent}%`);
  progressSection.createEl("p", {
    text: `${state.metrics.completedTaskCount} of ${state.metrics.taskCount} assignment tasks complete`
  });

  const contentGrid = container.createDiv({ cls: "pbg-dashboard__grid" });
  const todoSection = contentGrid.createDiv({ cls: "pbg-dashboard__section" });
  todoSection.createEl("h2", { text: "Assignment TODOs" });
  const todoList = todoSection.createEl("ul", { cls: "pbg-dashboard__list" });
  for (const todo of state.todos.slice(0, 6)) {
    todoList.createEl("li", { text: `${todo.text} (${todo.path})` });
  }
  if (state.todos.length === 0) {
    todoList.createEl("li", { text: "No open assignment TODOs found." });
  }

  const assignmentSection = contentGrid.createDiv({ cls: "pbg-dashboard__section" });
  assignmentSection.createEl("h2", { text: "Assignments" });
  const assignmentList = assignmentSection.createEl("ul", { cls: "pbg-dashboard__list" });
  for (const assignment of state.assignments.slice(0, 6)) {
    assignmentList.createEl("li", {
      text: `${assignment.title}: ${assignment.completedTaskCount}/${assignment.taskCount} tasks (${assignment.status})`
    });
  }
  if (state.assignments.length === 0) {
    assignmentList.createEl("li", { text: "No assignments found." });
  }

  const heatmapSection = container.createDiv({ cls: "pbg-dashboard__section" });
  heatmapSection.createEl("h2", { text: "Local Activity" });
  const heatmap = heatmapSection.createDiv({ cls: "pbg-dashboard__heatmap" });
  for (const item of state.heatmap) {
    const cell = heatmap.createDiv({ cls: `pbg-dashboard__heatmap-cell is-intensity-${item.intensity}` });
    cell.createEl("strong", { text: String(item.count) });
    cell.createEl("span", { text: item.label });
  }
}

function createActionButton(container: HTMLElement, label: string, onClick: () => void): void {
  const button = container.createEl("button", { text: label, cls: "mod-cta" });
  button.addEventListener("click", onClick);
}

function createMetric(container: HTMLElement, label: string, value: number): void {
  const metric = container.createDiv({ cls: "pbg-dashboard__metric" });
  metric.createEl("strong", { text: String(value) });
  metric.createEl("span", { text: label });
}
