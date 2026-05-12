import { App, PluginSettingTab, Setting } from "obsidian";
import type PbgAcademyGatewayPlugin from "./main.js";
import { DEFAULT_PLUGIN_SETTINGS, updateGatewayBaseUrl } from "./settings.js";

export class PbgAcademyGatewaySettingTab extends PluginSettingTab {
  constructor(app: App, private readonly plugin: PbgAcademyGatewayPlugin) {
    super(app, plugin);
  }

  display(): void {
    const { containerEl } = this;
    containerEl.empty();

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
  }
}
