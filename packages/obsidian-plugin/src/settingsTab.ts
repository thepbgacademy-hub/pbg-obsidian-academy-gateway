import { App, Notice, PluginSettingTab, Setting } from "obsidian";
import type PbgAcademyGatewayPlugin from "./main.js";
import { PbgGatewayApiClient } from "./apiClient.js";
import { DASHBOARD_PALETTE_LABELS } from "./dashboardPalette.js";
import {
  DEFAULT_PLUGIN_SETTINGS,
  type PbgDashboardPalette,
  updateDashboardPalette,
  updateGatewayBaseUrl,
  updateSessionTokens
} from "./settings.js";

const DEFAULT_POC_USERNAME = "pbg_test_student";
const DEFAULT_POC_PASSWORD = "pbg-test-password";
const POC_VAULT_ID = "poc-obsidian-vault";
const POC_DEVICE_FINGERPRINT = "poc-obsidian-device";

export class PbgAcademyGatewaySettingTab extends PluginSettingTab {
  constructor(app: App, private readonly plugin: PbgAcademyGatewayPlugin) {
    super(app, plugin);
  }

  display(): void {
    const { containerEl } = this;
    containerEl.empty();
    let academyUsername = this.plugin.settings.academyUsername ?? DEFAULT_POC_USERNAME;
    let academyPassword = DEFAULT_POC_PASSWORD;

    new Setting(containerEl)
      .setName("Gateway base URL")
      .setDesc("Local PBG gateway API origin.")
      .addText((text) =>
        text
          .setPlaceholder(DEFAULT_PLUGIN_SETTINGS.gatewayBaseUrl)
          .setValue(this.plugin.settings.gatewayBaseUrl)
          .onChange(async (value) => {
            this.plugin.settings = updateGatewayBaseUrl(this.plugin.settings, value);
            await this.plugin.saveSettings();
          })
      );

    new Setting(containerEl)
      .setName("Academy dashboard palette")
      .setDesc("Choose the PBG dashboard color palette without changing the rest of your Obsidian theme.")
      .addDropdown((dropdown) => {
        for (const [value, label] of Object.entries(DASHBOARD_PALETTE_LABELS)) {
          dropdown.addOption(value, label);
        }

        dropdown
          .setValue(this.plugin.settings.dashboardPalette)
          .onChange(async (value) => {
            this.plugin.settings = updateDashboardPalette(this.plugin.settings, value as PbgDashboardPalette);
            await this.plugin.saveSettings();
          });
      });

    new Setting(containerEl)
      .setName("Academy username")
      .setDesc("Used for the local POC sign-in flow.")
      .addText((text) =>
        text
          .setPlaceholder(DEFAULT_POC_USERNAME)
          .setValue(academyUsername)
          .onChange((value) => {
            academyUsername = value.trim() || DEFAULT_POC_USERNAME;
          })
      );

    new Setting(containerEl)
      .setName("Academy password")
      .setDesc("Used only to request a session token from the gateway.")
      .addText((text) =>
        text
          .setPlaceholder(DEFAULT_POC_PASSWORD)
          .setValue(academyPassword)
          .onChange((value) => {
            academyPassword = value.trim() || DEFAULT_POC_PASSWORD;
          })
      );

    new Setting(containerEl)
      .setName("Academy session")
      .setDesc(this.plugin.settings.accessToken ? "Signed in to the gateway." : "Not signed in.")
      .addButton((button) =>
        button.setButtonText("Sign In").onClick(async () => {
          button.setDisabled(true);

          try {
            const client = new PbgGatewayApiClient(this.plugin.settings.gatewayBaseUrl);
            const response = await client.login({
              username: academyUsername,
              password: academyPassword,
              vaultId: POC_VAULT_ID,
              deviceFingerprint: POC_DEVICE_FINGERPRINT,
              pluginVersion: this.plugin.manifest.version
            });

            this.plugin.settings = updateSessionTokens(this.plugin.settings, {
              accessToken: response.accessToken,
              refreshToken: response.refreshToken,
              academyUsername
            });
            await this.plugin.saveSettings();
            new Notice(`Signed in as ${response.student.displayName}`);
            this.display();
          } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            new Notice(`PBG sign-in failed: ${message}`);
          } finally {
            button.setDisabled(false);
          }
        })
      )
      .addExtraButton((button) =>
        button.setIcon("x").setTooltip("Clear saved session").onClick(async () => {
          this.plugin.settings = updateSessionTokens(this.plugin.settings, {
            accessToken: undefined,
            refreshToken: undefined,
            academyUsername
          });
          await this.plugin.saveSettings();
          new Notice("Cleared PBG gateway session");
          this.display();
        })
      );
  }
}
