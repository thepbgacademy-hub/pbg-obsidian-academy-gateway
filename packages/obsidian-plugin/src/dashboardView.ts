import { ItemView } from "obsidian";

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
    container.empty();
    container.addClass("pbg-dashboard");
    container.createEl("h1", { text: "PBG Academy Dashboard" });
    container.createEl("p", { text: "Gateway shell loaded." });
  }
}
