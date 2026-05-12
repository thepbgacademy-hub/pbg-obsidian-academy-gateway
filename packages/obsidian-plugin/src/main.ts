import { Plugin } from "obsidian";
import { PbgDashboardView, VIEW_TYPE_PBG_DASHBOARD } from "./dashboardView.js";
import { PBG_REQUIRED_PATHS } from "./onboarding.js";

export default class PbgAcademyGatewayPlugin extends Plugin {
  async onload(): Promise<void> {
    this.registerView(VIEW_TYPE_PBG_DASHBOARD, (leaf) => new PbgDashboardView(leaf));

    this.addCommand({
      id: "open-pbg-academy-dashboard",
      name: "Open PBG Academy Dashboard",
      callback: async () => {
        await this.ensurePbgFolders();
        await this.activateDashboard();
      }
    });
  }

  private async ensurePbgFolders(): Promise<void> {
    for (const path of PBG_REQUIRED_PATHS) {
      if (!this.app.vault.getAbstractFileByPath(path)) {
        await this.app.vault.createFolder(path);
      }
    }
  }

  private async activateDashboard(): Promise<void> {
    const leaf = this.app.workspace.getLeaf(true);
    await leaf.setViewState({ type: VIEW_TYPE_PBG_DASHBOARD, active: true });
    this.app.workspace.revealLeaf(leaf);
  }
}
