import { ItemView } from "obsidian";
import { computeLocalPbgMetrics, formatLocalPbgMetricLabels } from "./localState.js";

export const VIEW_TYPE_PBG_DASHBOARD = "pbg-academy-dashboard";

export class PbgDashboardView extends ItemView {
  getViewType(): string {
    return VIEW_TYPE_PBG_DASHBOARD;
  }

  getDisplayText(): string {
    return "PBG Academy";
  }

  async onOpen(): Promise<void> {
    const container = this.contentEl;
    const vaultPaths = this.app.vault.getFiles().map((file) => file.path);
    const localMetricLabels = formatLocalPbgMetricLabels(computeLocalPbgMetrics(vaultPaths));

    container.empty();
    container.addClass("pbg-dashboard");
    container.createEl("h1", { text: "PBG Academy Dashboard" });
    container.createEl("p", { text: "Connection: Local POC" });
    container.createEl("p", { text: "Vault Scope: PBG/" });

    container.createEl("h2", { text: "Actions" });
    const actionsList = container.createEl("ul");
    actionsList.createEl("li", { text: "Sync PBG Course Manifest" });
    actionsList.createEl("li", { text: "Run Assignment Coach on Active Note" });

    container.createEl("h2", { text: "Local Metrics" });
    const metricsList = container.createEl("ul");
    for (const label of localMetricLabels) {
      metricsList.createEl("li", { text: label });
    }
  }
}
