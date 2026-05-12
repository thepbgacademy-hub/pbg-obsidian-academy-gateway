$ErrorActionPreference = "Stop"

$RepoRoot = Split-Path -Parent $PSScriptRoot
$PluginRoot = Join-Path $RepoRoot "packages\obsidian-plugin"
$VaultPluginRoot = "E:\Obsidian\PBG Plug in\.obsidian\plugins\pbg-academy-gateway"

New-Item -ItemType Directory -Force -Path $VaultPluginRoot | Out-Null
Copy-Item -Force (Join-Path $PluginRoot "manifest.json") $VaultPluginRoot
Copy-Item -Force (Join-Path $PluginRoot "styles.css") $VaultPluginRoot
Copy-Item -Force (Join-Path $PluginRoot "dist\main.js") $VaultPluginRoot

Write-Host "Installed PBG Academy Gateway plugin to $VaultPluginRoot"
