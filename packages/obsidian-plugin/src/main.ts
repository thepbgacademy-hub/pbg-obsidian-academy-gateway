import { Notice, Plugin, TFolder, normalizePath } from "obsidian";
import { getCourseManifest } from "./apiClient.js";
import { getManifestWritePlan } from "./courseSync.js";
import { PbgDashboardView, VIEW_TYPE_PBG_DASHBOARD } from "./dashboardView.js";
import { PBG_REQUIRED_PATHS } from "./onboarding.js";

const DEFAULT_GATEWAY_BASE_URL = "http://localhost:8787";

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

    this.addCommand({
      id: "sync-pbg-course-manifest",
      name: "Sync PBG Course Manifest",
      callback: async () => {
        await this.syncCourseManifest();
      }
    });
  }

  private async syncCourseManifest(): Promise<void> {
    try {
      const manifest = await getCourseManifest(DEFAULT_GATEWAY_BASE_URL);
      const writePlan = getManifestWritePlan(manifest);
      let createdCount = 0;
      let skippedCount = 0;

      for (const item of writePlan) {
        const path = normalizePath(item.path);

        if (this.app.vault.getAbstractFileByPath(path)) {
          skippedCount += 1;
          continue;
        }

        await this.ensureParentFolders(path);
        await this.app.vault.create(path, item.body);
        createdCount += 1;
      }

      new Notice(`PBG manifest sync complete: ${createdCount} created, ${skippedCount} skipped.`);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      new Notice(`PBG manifest sync failed: ${message}`);
      console.error("PBG manifest sync failed", error);
    }
  }

  private async ensurePbgFolders(): Promise<void> {
    for (const path of PBG_REQUIRED_PATHS) {
      if (!this.app.vault.getAbstractFileByPath(path)) {
        await this.app.vault.createFolder(path);
      }
    }
  }

  private async ensureParentFolders(filePath: string): Promise<void> {
    const segments = filePath.split("/");
    segments.pop();

    let currentPath = "";
    for (const segment of segments) {
      currentPath = currentPath ? `${currentPath}/${segment}` : segment;
      const existing = this.app.vault.getAbstractFileByPath(currentPath);

      if (existing instanceof TFolder) {
        continue;
      }

      if (existing) {
        throw new Error(`Cannot create folder because a file already exists at ${currentPath}`);
      }

      await this.app.vault.createFolder(currentPath);
    }
  }

  private async activateDashboard(): Promise<void> {
    const leaf = this.app.workspace.getLeaf(true);
    await leaf.setViewState({ type: VIEW_TYPE_PBG_DASHBOARD, active: true });
    this.app.workspace.revealLeaf(leaf);
  }
}
