import { ItemView } from "obsidian";
import {
  advanceAnnouncementBlink,
  createAnnouncementViewState,
  mergeAnnouncementPayload,
  settleAnnouncementMotion,
  startAnnouncementBlink,
  type AnnouncementViewState
} from "./announcements.js";
import { PbgGatewayApiClient } from "./apiClient.js";
import { getAnnouncementBannerState } from "./dashboardBanner.js";
import { DASHBOARD_PALETTE_LABELS, DASHBOARD_PALETTE_CLASS_MAP, getDashboardPaletteClass } from "./dashboardPalette.js";
import { DEFAULT_DASHBOARD_FLAGS } from "./dashboardFlags.js";
import {
  clearDiscussionSeenPending,
  confirmDiscussionSeen,
  createDiscussionStatusState,
  markDiscussionSeenOptimistically,
  mergeDiscussionStatus,
  type DiscussionStatusState
} from "./discussionStatus.js";
import { createDashboardShellModel, type DashboardShellModel } from "./dashboardShell.js";
import {
  computeLocalPbgDashboardState,
  type LocalPbgDashboardState,
  type LocalPbgFileSnapshot
} from "./localState.js";
import { PBG_LOGO_DATA_URI } from "./logoData.js";
import { PLUGIN_ID } from "./pluginConstants.js";
import { normalizePluginSettings, type PbgAcademyGatewaySettings } from "./settings.js";

export const VIEW_TYPE_PBG_DASHBOARD = "pbg-academy-dashboard";
const SYNC_COURSE_MANIFEST_COMMAND_ID = "pbg-academy-gateway:sync-pbg-course-manifest";
const RUN_ASSIGNMENT_COACH_COMMAND_ID = "pbg-academy-gateway:run-assignment-coach-on-active-note";
const ANNOUNCEMENT_POLL_INTERVAL_MS = 60_000;
const DISCUSSION_POLL_INTERVAL_MS = 60_000;
const ANNOUNCEMENT_BLINK_STEP_MS = 350;
const ANNOUNCEMENT_ENTER_DURATION_MS = 5000;

export class PbgDashboardView extends ItemView {
  private localDashboardState: LocalPbgDashboardState = computeLocalPbgDashboardState([]);
  private announcementState: AnnouncementViewState = createAnnouncementViewState();
  private discussionStatus: DiscussionStatusState = createDiscussionStatusState();
  private announcementPollHandle?: number;
  private discussionPollHandle?: number;
  private announcementBlinkHandle?: number;
  private announcementMotionHandle?: number;
  private isDisposed = false;
  private isRailSettingsOpen = false;

  constructor(
    leaf: ConstructorParameters<typeof ItemView>[0],
    private readonly getSettings: () => PbgAcademyGatewaySettings,
    private readonly updatePalette: (palette: PbgAcademyGatewaySettings["dashboardPalette"]) => Promise<void>
  ) {
    super(leaf);
  }

  getViewType(): string {
    return VIEW_TYPE_PBG_DASHBOARD;
  }

  getDisplayText(): string {
    return "PBG Academy";
  }

  async onOpen(): Promise<void> {
    this.isDisposed = false;
    const container = this.contentEl;
    this.localDashboardState = computeLocalPbgDashboardState(await this.getLocalPbgFileSnapshots());
    if (this.isDisposed) {
      return;
    }

    this.announcementState = createAnnouncementViewState();
    this.discussionStatus = createDiscussionStatusState();
    this.isRailSettingsOpen = false;

    container.empty();
    container.addClass("pbg-dashboard");
    this.applyPaletteClass?.();
    this.renderDashboard();
    await this.refreshAnnouncements();
    if (this.isDisposed) {
      return;
    }

    await this.refreshDiscussionStatus();
    if (this.isDisposed) {
      return;
    }

    this.startAnnouncementPolling();
    this.startDiscussionPolling();
  }

  async onClose(): Promise<void> {
    this.isDisposed = true;
    this.stopAnnouncementPolling();
    this.stopDiscussionPolling();
    this.stopAnnouncementBlink();
    this.stopAnnouncementMotion();
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

  private renderDashboard(): void {
    const container = this.contentEl;
    const shell = createDashboardShellModel(
      this.localDashboardState,
      DEFAULT_DASHBOARD_FLAGS,
      this.announcementState,
      this.discussionStatus
    );

    container.empty();
    container.addClass("pbg-dashboard");
    this.applyPaletteClass();
    renderDashboardShell(
      container,
      shell,
      this.getSettings(),
      this.isRailSettingsOpen,
      PBG_LOGO_DATA_URI,
      (commandId) => this.executeCommand(commandId),
      (item) => this.handleRailItemClick(item),
      () => {
        this.isRailSettingsOpen = !this.isRailSettingsOpen;
        this.renderDashboard();
      },
      async (palette) => {
        await this.updatePalette(palette);
        this.applyPaletteClass();
        this.renderDashboard();
      }
    );
  }

  private startAnnouncementPolling(): void {
    this.stopAnnouncementPolling();
    if (this.isDisposed) {
      return;
    }

    if (!this.getGatewayClient()) {
      return;
    }

    this.announcementPollHandle = window.setInterval(() => {
      void this.refreshAnnouncements();
    }, ANNOUNCEMENT_POLL_INTERVAL_MS);
  }

  private stopAnnouncementPolling(): void {
    if (this.announcementPollHandle !== undefined) {
      window.clearInterval(this.announcementPollHandle);
      this.announcementPollHandle = undefined;
    }
  }

  private startDiscussionPolling(): void {
    this.stopDiscussionPolling();
    if (this.isDisposed) {
      return;
    }

    if (!this.getGatewayClient()) {
      return;
    }

    this.discussionPollHandle = window.setInterval(() => {
      void this.refreshDiscussionStatus();
    }, DISCUSSION_POLL_INTERVAL_MS);
  }

  private stopDiscussionPolling(): void {
    if (this.discussionPollHandle !== undefined) {
      window.clearInterval(this.discussionPollHandle);
      this.discussionPollHandle = undefined;
    }
  }

  private stopAnnouncementBlink(): void {
    if (this.announcementBlinkHandle !== undefined) {
      window.clearTimeout(this.announcementBlinkHandle);
      this.announcementBlinkHandle = undefined;
    }
  }

  private stopAnnouncementMotion(): void {
    if (this.announcementMotionHandle !== undefined) {
      window.clearTimeout(this.announcementMotionHandle);
      this.announcementMotionHandle = undefined;
    }
  }

  private async refreshAnnouncements(): Promise<void> {
    const client = this.getGatewayClient();
    if (!client) {
      return;
    }

    try {
      const payload = await client.getDashboardAnnouncements();
      if (this.isDisposed) {
        return;
      }

      const nextState = mergeAnnouncementPayload(this.announcementState, payload);
      const shouldStartMotion = nextState.motionPhase === "entering";

      this.announcementState = nextState;
      this.renderDashboard();

      if (shouldStartMotion) {
        this.runAnnouncementEnterCycle();
      }
    } catch (error) {
      console.warn("PBG dashboard announcements refresh failed", error);
    }
  }

  private async refreshDiscussionStatus(): Promise<void> {
    const client = this.getGatewayClient();
    if (!client) {
      this.clearDiscussionStatusIfNeeded();
      return;
    }

    try {
      const payload = await client.getDiscussionStatus();
      if (this.isDisposed) {
        return;
      }

      this.discussionStatus = mergeDiscussionStatus(this.discussionStatus, payload);
      this.renderDashboard();
    } catch (error) {
      if (isGatewaySessionError(error)) {
        this.clearDiscussionStatusIfNeeded();
      }
      console.warn("PBG discussion status refresh failed", error);
    }
  }

  private runAnnouncementBlinkCycle(): void {
    this.stopAnnouncementBlink();

    const advanceBlink = () => {
      if (this.isDisposed) {
        this.announcementBlinkHandle = undefined;
        return;
      }

      this.announcementState = advanceAnnouncementBlink(this.announcementState);
      this.renderDashboard();

      if (!this.announcementState.shouldBlink) {
        this.announcementBlinkHandle = undefined;
        return;
      }

      this.announcementBlinkHandle = window.setTimeout(advanceBlink, ANNOUNCEMENT_BLINK_STEP_MS);
    };

    this.announcementBlinkHandle = window.setTimeout(advanceBlink, ANNOUNCEMENT_BLINK_STEP_MS);
  }

  private runAnnouncementEnterCycle(): void {
    this.stopAnnouncementMotion();
    this.announcementMotionHandle = window.setTimeout(() => {
      if (this.isDisposed) {
        this.announcementMotionHandle = undefined;
        return;
      }

      this.announcementState = settleAnnouncementMotion(this.announcementState);
      this.announcementState = startAnnouncementBlink(this.announcementState);
      this.renderDashboard();
      if (this.announcementState.shouldBlink) {
        this.runAnnouncementBlinkCycle();
      }
      this.announcementMotionHandle = undefined;
    }, ANNOUNCEMENT_ENTER_DURATION_MS);
  }

  private getGatewayClient(): PbgGatewayApiClient | undefined {
    const settings = this.getPluginSettings();
    if (!settings.accessToken) {
      return undefined;
    }

    return new PbgGatewayApiClient(settings.gatewayBaseUrl, undefined, settings.accessToken);
  }

  private getPluginSettings(): PbgAcademyGatewaySettings {
    const appWithPlugins = this.app as typeof this.app & {
      plugins?: {
        plugins?: Record<string, { settings?: Partial<PbgAcademyGatewaySettings> }>;
      };
    };

    return normalizePluginSettings(appWithPlugins.plugins?.plugins?.[PLUGIN_ID]?.settings);
  }

  private handleRailItemClick(item: DashboardShellModel["leftRail"]["items"][number]): void {
    if (item.id !== "pbg-discussion") {
      return;
    }

    const client = this.getGatewayClient();
    if (!client) {
      return;
    }

    const href = this.discussionStatus.href;
    if (href) {
      globalThis.open?.(href, "_blank", "noopener,noreferrer");
    }

    this.discussionStatus = markDiscussionSeenOptimistically(this.discussionStatus);
    this.renderDashboard();

    void client.markDiscussionSeen().then((response) => {
      if (this.isDisposed) {
        return;
      }

      this.discussionStatus = confirmDiscussionSeen(this.discussionStatus, response);
      this.renderDashboard();
    }).catch((error) => {
      if (this.isDisposed) {
        return;
      }

      this.discussionStatus = isGatewaySessionError(error)
        ? createDiscussionStatusState()
        : clearDiscussionSeenPending(this.discussionStatus);
      this.renderDashboard();
      console.warn("PBG discussion seen update failed", error);
    });
  }

  private clearDiscussionStatusIfNeeded(): void {
    const clearedState = createDiscussionStatusState();
    if (
      this.discussionStatus.label !== clearedState.label ||
      this.discussionStatus.href !== clearedState.href ||
      this.discussionStatus.unreadCount !== clearedState.unreadCount ||
      this.discussionStatus.seenPending !== clearedState.seenPending
    ) {
      this.discussionStatus = clearedState;
      this.renderDashboard();
    }
  }

  private applyPaletteClass(): void {
    const container = this.contentEl;
    for (const className of Object.values(DASHBOARD_PALETTE_CLASS_MAP)) {
      container.removeClass(className);
    }
    container.addClass(getDashboardPaletteClass(this.getSettings().dashboardPalette));
  }

}

function renderDashboardShell(
  container: HTMLElement,
  shell: DashboardShellModel,
  settings: PbgAcademyGatewaySettings,
  isRailSettingsOpen: boolean,
  logoSrc: string | null,
  executeCommand: (commandId: string) => void,
  onRailItemClick: (item: DashboardShellModel["leftRail"]["items"][number]) => void,
  onToggleRailSettings: () => void,
  onPaletteSelect: (palette: PbgAcademyGatewaySettings["dashboardPalette"]) => Promise<void>
): void {
  const shellEl = container.createDiv({ cls: "pbg-shell" });
  const header = shellEl.createDiv({ cls: "pbg-shell__header" });
  const branding = header.createDiv({ cls: "pbg-shell__branding" });
  const brandingRow = branding.createDiv({ cls: "pbg-shell__brandingRow" });
  if (logoSrc) {
    brandingRow.createEl("img", {
      cls: "pbg-shell__brandLogo",
      attr: {
        src: logoSrc,
        alt: "PBG Academy lion logo"
      }
    });
  }
  brandingRow.createEl("div", {
    cls: "pbg-shell__brandMeta",
    text: "THE PRIDE PRIVATE BANKER'S GUILD ACADEMY   TELEGRAM: THEPRIDEPBG"
  });
  branding.createEl("h1", { text: shell.header.title });
  branding.createEl("p", { text: shell.header.subtitle });

  if (shell.header.announcementBannerEnabled) {
    renderAnnouncementBanner(header, shell.header.announcements);
  }

  const body = shellEl.createDiv({ cls: "pbg-shell__body" });
  renderLeftRail(body, shell, settings, isRailSettingsOpen, onRailItemClick, onToggleRailSettings, onPaletteSelect);

  const main = body.createDiv({ cls: "pbg-shell__main" });
  const state = shell.main;
  const focusSection = main.createDiv({ cls: "pbg-dashboard__section pbg-dashboard__focus" });
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

  const actionsSection = main.createDiv({ cls: "pbg-dashboard__section" });
  actionsSection.createEl("h2", { text: "Workflow Actions" });
  const actions = actionsSection.createDiv({ cls: "pbg-dashboard__actions" });
  createActionButton(actions, "Sync Course Manifest", () => executeCommand(SYNC_COURSE_MANIFEST_COMMAND_ID));
  createActionButton(actions, "Run Assignment Coach", () => executeCommand(RUN_ASSIGNMENT_COACH_COMMAND_ID));

  const metricsSection = main.createDiv({ cls: "pbg-dashboard__section" });
  metricsSection.createEl("h2", { text: "Local Metrics" });
  const metricsGrid = metricsSection.createDiv({ cls: "pbg-dashboard__metrics" });
  createMetric(metricsGrid, "Courses", state.metrics.courseFileCount);
  createMetric(metricsGrid, "Assignments", state.metrics.assignmentFileCount);
  createMetric(metricsGrid, "Workflow Results", state.metrics.workflowResultFileCount);
  createMetric(metricsGrid, "Open TODOs", state.metrics.openTaskCount);

  const progressSection = main.createDiv({ cls: "pbg-dashboard__section" });
  progressSection.createEl("h2", { text: "Course Progress" });
  const progress = progressSection.createDiv({ cls: "pbg-dashboard__progress" });
  const completionPercent = state.metrics.taskCount === 0 ? 0 : Math.round((state.metrics.completedTaskCount / state.metrics.taskCount) * 100);
  progress.createDiv({ cls: "pbg-dashboard__progress-bar" }).setAttr("style", `width: ${completionPercent}%`);
  progressSection.createEl("p", {
    text: `${state.metrics.completedTaskCount} of ${state.metrics.taskCount} assignment tasks complete`
  });

  const contentGrid = main.createDiv({ cls: "pbg-dashboard__grid" });
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

  const heatmapSection = main.createDiv({ cls: "pbg-dashboard__section" });
  heatmapSection.createEl("h2", { text: "Local Activity" });
  const heatmap = heatmapSection.createDiv({ cls: "pbg-dashboard__heatmap" });
  for (const item of state.heatmap) {
    const cell = heatmap.createDiv({ cls: `pbg-dashboard__heatmap-cell is-intensity-${item.intensity}` });
    cell.createEl("strong", { text: String(item.count) });
    cell.createEl("span", { text: item.label });
  }

  renderHiddenHermesSections(main, shell);
}

function renderAnnouncementBanner(container: HTMLElement, announcements?: AnnouncementViewState): void {
  const banner = container.createDiv({ cls: "pbg-shell__banner" });
  const bannerState = getAnnouncementBannerState(announcements);

  if (bannerState.kind === "placeholder") {
    banner.createEl("span", {
      cls: "pbg-shell__bannerPlaceholder",
      text: bannerState.text
    });
    return;
  }

  const classes = ["pbg-shell__bannerLink"];
  if (bannerState.shouldBlink) {
    classes.push("pbg-shell__bannerBlink");
  }
  classes.push(
    bannerState.motionPhase === "entering"
      ? "pbg-shell__bannerLink--entering"
      : "pbg-shell__bannerLink--resting"
  );

  const link = banner.createEl("a", {
    cls: classes.join(" ")
  });
  link.setAttr("href", bannerState.href);
  link.setAttr("target", "_blank");
  link.setAttr("rel", "noopener noreferrer");

  link.createEl("span", {
    cls: "pbg-shell__bannerLabel",
    text: bannerState.label
  });

  const track = link.createEl("span", {
    cls: bannerState.isProminent ? "pbg-shell__bannerTrack is-prominent" : "pbg-shell__bannerTrack"
  });
  track.createEl("span", {
    cls:
      bannerState.motionPhase === "entering"
        ? "pbg-shell__bannerText pbg-shell__bannerText--entering"
        : "pbg-shell__bannerText pbg-shell__bannerText--resting",
    text: bannerState.text
  });
}

function renderLeftRail(
  container: HTMLElement,
  shell: DashboardShellModel,
  settings: PbgAcademyGatewaySettings,
  isRailSettingsOpen: boolean,
  onRailItemClick: (item: DashboardShellModel["leftRail"]["items"][number]) => void,
  onToggleRailSettings: () => void,
  onPaletteSelect: (palette: PbgAcademyGatewaySettings["dashboardPalette"]) => Promise<void>
): void {
  const rail = container.createDiv({ cls: "pbg-shell__rail" });
  rail.createEl("p", { cls: "pbg-shell__railEyebrow", text: "Academy Shell" });

  const nav = rail.createEl("nav", { cls: "pbg-shell__railNav" });
  for (const item of shell.leftRail.items) {
    const classes = ["pbg-shell__railItem"];
    if (item.id === "dashboard") {
      classes.push("is-active");
    }

    if (item.href && item.external) {
      classes.push("is-link");
      const button = nav.createEl("button", {
        cls: classes.join(" "),
        attr: { type: "button" }
      });
      button.createEl("span", {
        cls: "pbg-shell__railItemLabel",
        text: item.label
      });
      if (item.badgeLabel) {
        button.createEl("span", {
          cls: "pbg-shell__railBadge",
          text: item.badgeLabel
        });
      }
      button.addEventListener("click", () => onRailItemClick(item));
      continue;
    }

    const railItem = nav.createEl("div", {
      cls: classes.join(" ")
    });
    railItem.createEl("span", {
      cls: "pbg-shell__railItemLabel",
      text: item.label
    });
    if (item.badgeLabel) {
      railItem.createEl("span", {
        cls: "pbg-shell__railBadge",
        text: item.badgeLabel
      });
    }
  }

  const railFooter = rail.createDiv({ cls: "pbg-shell__railFooter" });
  const settingsButton = railFooter.createEl("button", {
    cls: `pbg-shell__railSettingsButton${isRailSettingsOpen ? " is-open" : ""}`,
    attr: { type: "button" },
    text: "Settings"
  });
  settingsButton.addEventListener("click", onToggleRailSettings);

  if (isRailSettingsOpen) {
    const panel = railFooter.createDiv({ cls: "pbg-shell__railSettingsPanel" });
    panel.createEl("div", { cls: "pbg-shell__railSettingsTitle", text: "Palette" });
    const options = panel.createDiv({ cls: "pbg-shell__railPaletteOptions" });
    for (const [palette, label] of Object.entries(DASHBOARD_PALETTE_LABELS)) {
      const option = options.createEl("button", {
        cls:
          `pbg-shell__railPaletteOption pbg-shell__railPaletteOption--${palette}` +
          `${settings.dashboardPalette === palette ? " is-selected" : ""}`,
        attr: { type: "button" },
        text: label
      });
      option.addEventListener("click", () => {
        void onPaletteSelect(palette as PbgAcademyGatewaySettings["dashboardPalette"]);
      });
    }
  }
}

function renderHiddenHermesSections(container: HTMLElement, shell: DashboardShellModel): void {
  if (shell.hiddenSections.showHermesShellExtras) {
    container.createDiv({ cls: "pbg-shell__futureRegion", text: "Future shell extras" });
  }

  if (shell.hiddenSections.showHermesSidebarTools) {
    container.createDiv({ cls: "pbg-shell__futureRegion", text: "Future sidebar tools" });
  }

  if (shell.hiddenSections.showHermesSecondaryPanels) {
    container.createDiv({ cls: "pbg-shell__futureRegion", text: "Future secondary panels" });
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

function isGatewaySessionError(error: unknown): boolean {
  return error instanceof Error && /\((401|403)\s/.test(error.message);
}
