# PBG Obsidian Academy Gateway

Obsidian plugin and gateway services for the PBG Academy dashboard experience.

The project is designed around a dedicated local-first PBG Vault, with the VPS providing login, subscription checks, academy credit checks, course update manifests, and workflow execution.

This repository is currently a private/local POC. Do not launch it on a public VPS until the security launch gates in `docs/test-build-security-checklist.md` are cleared.

See the design spec:

- `docs/superpowers/specs/2026-05-12-pbg-obsidian-academy-gateway-design.md`
- `docs/test-build-security-checklist.md`

## Configuration

1. Copy `.env.example` to a local env file for private testing.
2. Replace every placeholder before running anything outside a local/private POC.
3. Keep real env files out of git. `.gitignore` ignores `.env` and `.env.*` while allowing only `.env.example`.

## Local POC Workflow

1. Run `npm install`.
2. Run `npm test`.
3. Start the gateway API with `npm --workspace @pbg/gateway-api run dev`.
4. If port `8787` is already in use, start the gateway on another local port and update the plugin setting for the gateway base URL.
5. Build the plugin with `npm --workspace pbg-academy-gateway run build`.
6. Install the plugin with `.\scripts\install-plugin.ps1 -VaultPath "E:\Obsidian\PBG Plug in" -ConfirmInstall -Confirm:$false`.
7. Open `E:\Obsidian\PBG Plug in` in Obsidian and enable PBG Academy Gateway.
8. Run `Open PBG Academy Dashboard`, then use `Sync PBG Course Manifest` and `Run Assignment Coach on Active Note` from the command palette.

The install script defaults to `E:\Obsidian\PBG Plug in`, validates that the vault path exists and contains `.obsidian`, and requires `-ConfirmInstall` before writing plugin files. Use `-WhatIf` to preview the target without copying files.

Keep this workflow on a local machine or private test host. Public/VPS launch remains blocked while seeded credentials, stubbed service integrations, or placeholder secrets are present.

For a full local smoke check, run:

```powershell
.\scripts\smoke-test-plugin.ps1 -VaultPath "E:\Obsidian\PBG Plug in" -ConfirmInstall
```
