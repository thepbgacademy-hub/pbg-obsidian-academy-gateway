# Dashboard Feature Map

Last updated: `2026-05-16`

## Purpose

This document maps the visible `PBG Academy` dashboard features to their current behavior and implementation files.

Use this when you want to answer:

- what each dashboard region does
- where its code lives
- whether it is local-only, gateway-backed, or externally integrated

## Header

### Branding Row

Behavior:

- Shows academy lion logo on the left
- Shows guild/Telegram brand line aligned to the logo
- Shows `PBG Academy` title below the brand line
- Keeps the subtitle under the title

Current brand line:

- `THE PRIDE PRIVATE BANKER'S GUILD ACADEMY   TELEGRAM: THEPRIDEPBG`

Primary files:

- `C:\tmp\pbg-obsidian-academy-gateway-work\packages\obsidian-plugin\src\dashboardView.ts`
- `C:\tmp\pbg-obsidian-academy-gateway-work\packages\obsidian-plugin\styles.css`
- `C:\tmp\pbg-obsidian-academy-gateway-work\packages\obsidian-plugin\src\logoData.ts`

### Announcement Banner

Behavior:

- Displays academy announcement message in the header
- Message enters from the right
- Centers and holds
- Blinks after settling
- Replaces immediately when a new message arrives

Data source:

- gateway-backed

Primary files:

- `C:\tmp\pbg-obsidian-academy-gateway-work\packages\obsidian-plugin\src\announcements.ts`
- `C:\tmp\pbg-obsidian-academy-gateway-work\packages\obsidian-plugin\src\dashboardBanner.ts`
- `C:\tmp\pbg-obsidian-academy-gateway-work\packages\obsidian-plugin\src\dashboardView.ts`
- `C:\tmp\pbg-obsidian-academy-gateway-work\packages\gateway-api\src\app.ts`
- `C:\tmp\pbg-obsidian-academy-gateway-work\packages\shared\src\contracts.ts`

## Left Rail

### Primary Navigation

Current visible items:

- `Dashboard`
- `Courses`
- `Assignments`
- `Workflows`
- `Results`

Behavior:

- currently acts as shell/navigation structure
- some items are placeholders for future refinement while course architecture is still evolving

Primary files:

- `C:\tmp\pbg-obsidian-academy-gateway-work\packages\obsidian-plugin\src\dashboardShell.ts`
- `C:\tmp\pbg-obsidian-academy-gateway-work\packages\obsidian-plugin\src\dashboardView.ts`
- `C:\tmp\pbg-obsidian-academy-gateway-work\packages\obsidian-plugin\styles.css`

### PBG Discussion

Behavior:

- shows per-student unread activity count
- opens Telegram group on click
- clears unread state immediately on click

Data source:

- gateway-backed
- cached Telegram activity from n8n workflow

Primary files:

- `C:\tmp\pbg-obsidian-academy-gateway-work\packages\obsidian-plugin\src\discussionStatus.ts`
- `C:\tmp\pbg-obsidian-academy-gateway-work\packages\obsidian-plugin\src\dashboardShell.ts`
- `C:\tmp\pbg-obsidian-academy-gateway-work\packages\obsidian-plugin\src\dashboardView.ts`
- `C:\tmp\pbg-obsidian-academy-gateway-work\packages\gateway-api\src\app.ts`
- `C:\tmp\pbg-obsidian-academy-gateway-work\ops\n8n\pbg-discussion-counter.workflow.json`

### Left-Rail Settings

Behavior:

- sits at the bottom of the rail
- opens in-dashboard settings panel
- currently used for palette switching

Primary files:

- `C:\tmp\pbg-obsidian-academy-gateway-work\packages\obsidian-plugin\src\dashboardView.ts`
- `C:\tmp\pbg-obsidian-academy-gateway-work\packages\obsidian-plugin\styles.css`

## Main Workspace

### Current Focus

Behavior:

- shows the current assignment focus
- shows progress label
- shows next TODO
- shows assignment path

Data source:

- local vault-derived

Primary files:

- `C:\tmp\pbg-obsidian-academy-gateway-work\packages\obsidian-plugin\src\localState.ts`
- `C:\tmp\pbg-obsidian-academy-gateway-work\packages\obsidian-plugin\src\dashboardView.ts`

### Workflow Actions

Current buttons:

- `Sync Course Manifest`
- `Run Assignment Coach`

Behavior:

- `Sync Course Manifest` pulls academy-managed content into the vault
- `Run Assignment Coach` triggers the workflow path for the current assignment note

Data source:

- gateway-backed action buttons with local vault effects

Primary files:

- `C:\tmp\pbg-obsidian-academy-gateway-work\packages\obsidian-plugin\src\main.ts`
- `C:\tmp\pbg-obsidian-academy-gateway-work\packages\obsidian-plugin\src\apiClient.ts`
- `C:\tmp\pbg-obsidian-academy-gateway-work\packages\obsidian-plugin\src\dashboardView.ts`

### Local Metrics

Current metrics:

- `Courses`
- `Assignments`
- `Workflow Results`
- `Open TODOs`

Behavior:

- computed from academy-scoped local vault files under `PBG/`

Primary files:

- `C:\tmp\pbg-obsidian-academy-gateway-work\packages\obsidian-plugin\src\localState.ts`
- `C:\tmp\pbg-obsidian-academy-gateway-work\packages\obsidian-plugin\src\dashboardView.ts`

### Course Progress

Behavior:

- displays task completion progress bar
- computed from assignment task counts in local vault content

Data source:

- local vault-derived

Primary files:

- `C:\tmp\pbg-obsidian-academy-gateway-work\packages\obsidian-plugin\src\localState.ts`
- `C:\tmp\pbg-obsidian-academy-gateway-work\packages\obsidian-plugin\src\dashboardView.ts`

### Assignment TODOs

Behavior:

- shows open TODOs extracted from academy assignment notes

Data source:

- local vault-derived

Primary files:

- `C:\tmp\pbg-obsidian-academy-gateway-work\packages\obsidian-plugin\src\localState.ts`
- `C:\tmp\pbg-obsidian-academy-gateway-work\packages\obsidian-plugin\src\dashboardView.ts`

### Assignments

Behavior:

- shows assignment summaries with task progress and status

Data source:

- local vault-derived

Primary files:

- `C:\tmp\pbg-obsidian-academy-gateway-work\packages\obsidian-plugin\src\localState.ts`
- `C:\tmp\pbg-obsidian-academy-gateway-work\packages\obsidian-plugin\src\dashboardView.ts`

### Local Activity

Behavior:

- summary-style metrics block based on local academy state

Data source:

- local vault-derived

Primary files:

- `C:\tmp\pbg-obsidian-academy-gateway-work\packages\obsidian-plugin\src\dashboardView.ts`
- `C:\tmp\pbg-obsidian-academy-gateway-work\packages\obsidian-plugin\src\localState.ts`

## Appearance / Palette

### Current Palette Options

- `PBG Teal`
- `Obsidian Native`

Behavior:

- palette can be changed from:
  - plugin settings tab
  - left-rail settings panel
- palette is dashboard-scoped and does not replace the full Obsidian app theme

Primary files:

- `C:\tmp\pbg-obsidian-academy-gateway-work\packages\obsidian-plugin\src\settings.ts`
- `C:\tmp\pbg-obsidian-academy-gateway-work\packages\obsidian-plugin\src\settingsTab.ts`
- `C:\tmp\pbg-obsidian-academy-gateway-work\packages\obsidian-plugin\src\dashboardPalette.ts`
- `C:\tmp\pbg-obsidian-academy-gateway-work\packages\obsidian-plugin\styles.css`

## Integration Summary

### Local-Only / Vault-Derived

- current focus
- local metrics
- course progress
- assignment TODOs
- assignments
- local activity

### Gateway-Backed

- sign-in/session-backed actions
- announcement banner payload
- manifest sync
- assignment coach trigger
- discussion status
- discussion seen update

### External Integration

- Telegram group activity
- n8n cached polling workflow

## Recommended Companion Docs

- Current build state:
  - `C:\tmp\pbg-obsidian-academy-gateway-work\docs\current-build-state.md`
- Telegram admin notes:
  - `C:\tmp\pbg-obsidian-academy-gateway-work\docs\telegram-discussion-admin.md`
- Error log:
  - `C:\tmp\pbg-obsidian-academy-gateway-work\docs\build-error-log.md`
