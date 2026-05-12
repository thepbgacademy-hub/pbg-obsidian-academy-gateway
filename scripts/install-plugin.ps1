[CmdletBinding(SupportsShouldProcess = $true, ConfirmImpact = "High")]
param(
  [string]$VaultPath = "E:\Obsidian\PBG Plug in",
  [switch]$ConfirmInstall
)

$ErrorActionPreference = "Stop"

$RepoRoot = Split-Path -Parent $PSScriptRoot
$PluginRoot = Join-Path $RepoRoot "packages\obsidian-plugin"
$ObsidianRoot = Join-Path $VaultPath ".obsidian"
$VaultPluginRoot = Join-Path $ObsidianRoot "plugins\pbg-academy-gateway"

if (-not (Test-Path -LiteralPath $VaultPath -PathType Container)) {
  throw "VaultPath must exist before installing: $VaultPath"
}

if (-not (Test-Path -LiteralPath $ObsidianRoot -PathType Container)) {
  throw "VaultPath must contain a .obsidian folder before installing: $VaultPath"
}

if (-not $ConfirmInstall -and -not $WhatIfPreference) {
  throw "Install requires -ConfirmInstall. Use -WhatIf to preview without writing."
}

if ($PSCmdlet.ShouldProcess($VaultPluginRoot, "Install PBG Academy Gateway plugin")) {
  New-Item -ItemType Directory -Force -Path $VaultPluginRoot | Out-Null
  Copy-Item -Force (Join-Path $PluginRoot "manifest.json") $VaultPluginRoot
  Copy-Item -Force (Join-Path $PluginRoot "styles.css") $VaultPluginRoot
  Copy-Item -Force (Join-Path $PluginRoot "dist\main.js") $VaultPluginRoot

  Write-Host "Installed PBG Academy Gateway plugin to $VaultPluginRoot"
}
