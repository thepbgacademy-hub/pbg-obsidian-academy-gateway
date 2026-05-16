# PBG Hermes Layout Adaptation Design

Date: 2026-05-15

## Goal

Adapt the Hermes dashboard layout pattern into the PBG Obsidian Academy dashboard so the plugin gets a cleaner, more user-friendly shell without inheriting visible Hermes-specific product elements.

The user wants:

- the Hermes layout feel, especially the left rail plus main workspace composition
- an academy-branded header instead of Hermes header content
- a read-only, link-only scrolling announcement banner in the header
- hidden Hermes-derived areas behind flags for future use
- no popup notices for announcements
- announcement freshness handled through polling, not push

## Current Constraint

The left menu information architecture is intentionally provisional.

The academy is still designing the final course and student-option structure, so the left rail must be treated as shell scaffolding only. We will keep a small placeholder navigation model for now and refine it later once course architecture is concrete.

This means:

- build the rail layout now
- keep labels simple and low-commitment
- avoid baking deep course taxonomy into the nav
- keep navigation easy to revise without rewriting the dashboard shell

## Recommended Approach

Use an academy-native shell that recreates the Hermes layout pattern inside the Obsidian dashboard rather than trying to port the Hermes web app literally.

This gives us:

- the Hermes user-friendly composition
- a cleaner fit for Obsidian plugin rendering
- less coupling to Hermes-specific web/plugin systems
- easier future customization for academy needs

## Layout Structure

The dashboard shell will be split into four regions.

### 1. Academy Header

Visible at the top of the dashboard.

Purpose:

- show academy branding/logo
- show the academy announcement banner
- provide a stable dashboard identity anchor

First-pass behavior:

- logo or academy wordmark on the left
- scrolling announcement banner across the header area
- no popup notices
- no Telegram-specific UI here
- no user-action interruption

### 2. Left Rail

A Hermes-inspired vertical rail used for lightweight navigation and shell balance.

Purpose:

- create the structured dashboard feel the user wants
- provide a place for future academy navigation and status items
- preserve the visual rhythm of the Hermes layout

Important constraint:

- the left rail is not final product IA yet
- initial items are placeholders, not permanent taxonomy

First-pass visible placeholders may include:

- Dashboard
- Courses
- Assignments
- Workflows
- Results

These are scaffolding labels only and may change later.

### 3. Main Workspace

Primary academy dashboard content.

Purpose:

- render the actual PBG student classroom/dashboard experience

First-pass visible content:

- current focus
- local metrics
- course progress
- assignments
- TODOs
- workflow action buttons
- local activity/heatmap

This area should remain academy-first even though the outer shell borrows the Hermes layout pattern.

### 4. Hidden Future Regions

Hermes-derived regions or concepts that are retained structurally but hidden behind flags.

Purpose:

- allow later unlocks without redesigning the shell
- avoid showing Hermes product concepts prematurely

Examples:

- secondary side panels
- extra sidebar tool groups
- optional shell chrome sections

## Feature Flag Model

We need flags from day one so the shell can be extended later without layout churn.

Suggested flags:

- `showAcademyAnnouncementBanner`
- `showHermesShellExtras`
- `showHermesSidebarTools`
- `showHermesSecondaryPanels`

Initial values:

- `showAcademyAnnouncementBanner = true`
- all Hermes-specific flags default to `false`

The flag model should be simple local configuration at first, with room to move to gateway-provided flags later.

## Announcement Banner Design

The academy announcement system must reach students inside Obsidian even if they are not checking Telegram often.

### Banner Requirements

- header-only
- read-only
- link-only
- no notices/popups
- subtle but attention-getting
- updates automatically when new content appears

### Motion Behavior

When there is active content:

- banner scrolls horizontally
- when a newly detected announcement arrives, the banner performs a short three-blink attention cycle
- after the blink cycle, the banner returns to its normal scrolling state

This is meant to be visible without becoming noisy.

### Data Source

The plugin should not query Supabase directly.

Correct path:

1. Obsidian plugin polls the academy gateway
2. academy gateway queries Supabase for active banner announcements
3. gateway returns normalized banner payload
4. plugin updates the header banner in place

This preserves server control, reduces client coupling, and keeps academy announcement logic centralized.

### Polling Strategy

Use light polling for the first version.

Why:

- simpler than live push
- more robust inside Obsidian plugin constraints
- enough for classroom announcements
- easy to reason about and test

The polling interval should be conservative and non-distracting. It only needs to be timely enough for announcements, not chat-like realtime.

## Announcement Data Model

First-pass normalized payload:

- `id`
- `label`
- `text`
- `href`
- `published_at`
- `expires_at`
- `is_active`

Possible future additions:

- `audience_scope`
- `campaign_key`
- `banner_theme`

Those future fields are out of scope for the first pass.

## Data Flow

The dashboard remains local-first with a remote academy overlay.

### Local State

Computed from the PBG vault:

- assignments
- TODOs
- workflow result files
- local progress
- local heatmap metrics

### Remote State

Fetched through the gateway:

- active announcement banner items
- feature flags
- future academy dashboard metadata

### Merge Strategy

The dashboard shell renders once and fills regions from two sources:

- local vault-derived classroom state
- remote academy-controlled broadcast/config state

This keeps the dashboard useful offline-ish for student work while preserving academy control over broadcasts and future remote gating.

## Testing Plan

Add focused tests for:

- shell rendering with flags on/off
- academy header rendering
- announcement banner rendering
- polling update behavior
- new-announcement blink trigger
- hidden Hermes regions staying hidden by default
- left rail placeholder rendering without committing to final IA

## Out of Scope

Not part of this design pass:

- final course taxonomy
- final student navigation model
- Telegram classroom integration details
- live push announcement transport
- provider credential management
- Hermes functional feature parity

## Implementation Direction

The next implementation plan should focus on:

1. restructuring the current Obsidian dashboard into a Hermes-inspired shell
2. adding an academy header region
3. wiring a placeholder announcement banner component with polling contract
4. introducing local feature flags for hidden Hermes-derived regions
5. preserving existing dashboard content inside the new main workspace

## Approval Notes

User approved:

- Hermes-inspired middle-ground shell
- academy header instead of Hermes top chrome
- read-only link-only announcement banner
- polling instead of push
- provisional left rail that can be refined later
