param(
  [string]$VaultPath = "E:\Obsidian\PBG Plug in",
  [switch]$ConfirmInstall
)

$ErrorActionPreference = "Stop"

npm test
npm run typecheck
npm run build
.\scripts\install-plugin.ps1 -VaultPath $VaultPath -ConfirmInstall:$ConfirmInstall -Confirm:$false

Write-Host "Smoke checks passed. Open the Obsidian test vault for manual plugin verification."
