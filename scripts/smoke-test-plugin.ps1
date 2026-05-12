$ErrorActionPreference = "Stop"

npm test
npm run typecheck
npm run build
.\scripts\install-plugin.ps1

Write-Host "Smoke checks passed. Open the Obsidian test vault for manual plugin verification."
