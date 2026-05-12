# PBG Obsidian Academy Gateway

Obsidian plugin and gateway services for the PBG Academy dashboard experience.

The project is designed around a dedicated local-first PBG Vault, with the VPS providing login, subscription checks, academy credit checks, course update manifests, and workflow execution.

See the design spec:

- `docs/superpowers/specs/2026-05-12-pbg-obsidian-academy-gateway-design.md`

## Local POC Workflow

1. Run `npm install`.
2. Run `npm test`.
3. Start the gateway API with `npm --workspace @pbg/gateway-api run dev`.
4. If port `8787` is already in use, start the gateway on another local port and update the plugin setting for the gateway base URL.
5. Build the plugin with `npm --workspace pbg-academy-gateway run build`.
6. Install the plugin with `.\scripts\install-plugin.ps1`.
7. Open `E:\Obsidian\PBG Plug in` in Obsidian and enable PBG Academy Gateway.
8. Run `Open PBG Academy Dashboard`, then use `Sync PBG Course Manifest` and `Run Assignment Coach on Active Note` from the command palette.

For a full local smoke check, run:

```powershell
.\scripts\smoke-test-plugin.ps1
```
