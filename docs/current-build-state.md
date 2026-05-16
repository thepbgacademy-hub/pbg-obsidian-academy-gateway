# Current Build State

Last updated: `2026-05-16`

## Purpose

This document describes the actual implemented state of the `pbg-obsidian-academy-gateway` build. Unlike the specs and plans, this file is meant to answer:

- what is live in the current branch
- what has been verified working
- what is still POC or provisional
- where the important integration points live

## Repository And Branch

- GitHub repo: `https://github.com/thepbgacademy-hub/pbg-obsidian-academy-gateway`
- Active branch used for the current build: `codex/pbg-obsidian-poc`
- Local working repo: `C:\tmp\pbg-obsidian-academy-gateway-work`

## Live Local Test Surface

- Test vault: `E:\Obsidian\PBG Plug in`
- Installed plugin path:
  - `E:\Obsidian\PBG Plug in\.obsidian\plugins\pbg-academy-gateway`
- Local gateway base URL used in the plugin:
  - `http://localhost:8788`

## Verified Working

The following items have been tested successfully in live desktop Obsidian, not just in unit tests.

### 1. Dashboard View

- The `Open PBG Academy Dashboard` command opens the custom dashboard view.
- The dashboard renders inside Obsidian with:
  - academy header
  - left rail
  - main content cards
  - announcement banner region

### 2. Manifest Sync

- The plugin can sign in with the seeded test credentials.
- The `Sync Course Manifest` action succeeds against the local gateway.
- The plugin writes academy-managed content into the `PBG/` vault structure.
- Synced content updates local metrics and current-focus sections in the dashboard.

### 3. Academy Announcement Banner

- Banner content is gateway-driven.
- Banner motion behavior:
  - enters from right
  - settles centered
  - blinks after settling
- Banner styling has been tuned for readability in `PBG Teal`.

### 4. Hermes-Inspired Academy Shell

- Dashboard structure now follows the adapted Hermes-style layout:
  - left rail
  - branded header
  - central workspace
  - hidden future regions behind flags
- This is implemented as an academy-branded shell, not a direct Hermes product clone.

### 5. Discussion Badge

- Left rail contains `PBG Discussion`.
- The badge shows unread activity count for the signed-in student.
- Clicking it:
  - opens the Telegram group
  - clears the badge immediately for that student

### 6. Real Telegram Activity Integration

- Real Telegram group activity is wired through n8n and the gateway.
- The live group is locked to Telegram `chatId`:
  - `-1002059446209`
- The polling model is cached and lightweight:
  - n8n polls Telegram every `30 minutes`
  - gateway serves cached state
  - plugin polls gateway, not Telegram directly

### 7. Dashboard Palette Controls

- Plugin settings include a dashboard palette selector.
- In-dashboard left-rail `Settings` control also allows palette switching.
- Current palette options:
  - `PBG Teal`
  - `Obsidian Native`

### 8. Branding

- The dashboard header includes the academy lion logo.
- The academy guild line is vertically aligned to the logo.
- Current brand line:
  - `THE PRIDE PRIVATE BANKER'S GUILD ACADEMY   TELEGRAM: THEPRIDEPBG`

## Current POC / Provisional Areas

These parts are intentionally not yet final-production implementations.

### Authentication

- The current live test flow still uses seeded POC credentials for local verification.
- Real academy auth integration is not yet the final production auth story.

### Subscription / Credits / Entitlements

- Production-grade subscription enforcement, academy credits, and entitlement controls are not the final completed system yet.
- The build has design direction for them, but not the final hardened launch implementation.

### Device Enforcement

- One-device/vault policy is part of the design direction.
- Full production-grade enforcement is not yet the final completed state.

### Announcement Source

- Dashboard banner pipeline is working structurally.
- Long-term live academy announcement management is expected to come from backend-managed records, not hard-coded POC payloads.

## Important Live Integrations

### Telegram / Discussion

- Telegram invite link:
  - `https://t.me/+Xpdv7ztBFFc1MGVh`
- n8n workflow source:
  - `C:\tmp\pbg-obsidian-academy-gateway-work\ops\n8n\pbg-discussion-counter.workflow.json`
- Active admin note:
  - `C:\tmp\pbg-obsidian-academy-gateway-work\docs\telegram-discussion-admin.md`

### Gateway

- Main gateway app:
  - `C:\tmp\pbg-obsidian-academy-gateway-work\packages\gateway-api\src\app.ts`
- Gateway server bootstrap:
  - `C:\tmp\pbg-obsidian-academy-gateway-work\packages\gateway-api\src\server.ts`

### Obsidian Plugin

- Main plugin entry:
  - `C:\tmp\pbg-obsidian-academy-gateway-work\packages\obsidian-plugin\src\main.ts`
- Dashboard view:
  - `C:\tmp\pbg-obsidian-academy-gateway-work\packages\obsidian-plugin\src\dashboardView.ts`
- Dashboard styles:
  - `C:\tmp\pbg-obsidian-academy-gateway-work\packages\obsidian-plugin\styles.css`

## Important Design / Planning Docs

These are still useful, but they are intent/planning docs rather than the source of truth for current implemented state.

- Base design:
  - `C:\tmp\pbg-obsidian-academy-gateway-work\docs\superpowers\specs\2026-05-12-pbg-obsidian-academy-gateway-design.md`
- Hermes adaptation spec:
  - `C:\tmp\pbg-obsidian-academy-gateway-work\docs\superpowers\specs\2026-05-15-pbg-hermes-layout-adaptation-design.md`
- Discussion badge spec:
  - `C:\tmp\pbg-obsidian-academy-gateway-work\docs\superpowers\specs\2026-05-15-pbg-discussion-badge-design.md`
- Hermes adaptation plan:
  - `C:\tmp\pbg-obsidian-academy-gateway-work\docs\superpowers\plans\2026-05-15-pbg-hermes-layout-adaptation.md`
- Discussion badge plan:
  - `C:\tmp\pbg-obsidian-academy-gateway-work\docs\superpowers\plans\2026-05-15-pbg-discussion-badge.md`

## Verification Snapshot

As of this document:

- `npm test` passes
- `npm run typecheck` passes
- `npm run build` passes
- live Obsidian manual verification has succeeded for:
  - dashboard open
  - login
  - manifest sync
  - local metrics refresh
  - discussion badge open-and-clear behavior
  - header/logo/palette UI behavior

## Suggested Next Build Areas

Recommended next work, in rough order:

1. production-grade auth bridge to academy user system
2. real backend-managed academy announcements
3. subscription / credits / entitlements enforcement
4. device/vault enforcement hardening
5. deeper course-material navigation in the main pane
6. additional dashboard palettes and navigation refinement
