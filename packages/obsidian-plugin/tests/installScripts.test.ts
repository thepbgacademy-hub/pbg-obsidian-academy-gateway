import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const repoRoot = process.cwd();

function scriptText(scriptName: string): string {
  return readFileSync(join(repoRoot, "scripts", scriptName), "utf8");
}

describe("plugin install scripts", () => {
  it("requires an explicit install confirmation and validates the vault before writing", () => {
    const text = scriptText("install-plugin.ps1");

    expect(text).toContain("[CmdletBinding(SupportsShouldProcess = $true, ConfirmImpact = \"High\")]");
    expect(text).toContain("[string]$VaultPath = \"E:\\Obsidian\\PBG Plug in\"");
    expect(text).toContain("[switch]$ConfirmInstall");
    expect(text).toContain("Test-Path -LiteralPath $VaultPath -PathType Container");
    expect(text).toContain("Test-Path -LiteralPath $ObsidianRoot -PathType Container");
    expect(text).toContain("throw \"VaultPath must exist before installing");
    expect(text).toContain("throw \"VaultPath must contain a .obsidian folder");
    expect(text).toContain("$PSCmdlet.ShouldProcess($VaultPluginRoot, \"Install PBG Academy Gateway plugin\")");
    expect(text).toContain("Install requires -ConfirmInstall");
  });

  it("passes VaultPath and confirmation through the smoke script", () => {
    const text = scriptText("smoke-test-plugin.ps1");

    expect(text).toContain("[string]$VaultPath = \"E:\\Obsidian\\PBG Plug in\"");
    expect(text).toContain("[switch]$ConfirmInstall");
    expect(text).toContain(".\\scripts\\install-plugin.ps1 -VaultPath $VaultPath -ConfirmInstall:$ConfirmInstall -Confirm:$false");
  });
});
