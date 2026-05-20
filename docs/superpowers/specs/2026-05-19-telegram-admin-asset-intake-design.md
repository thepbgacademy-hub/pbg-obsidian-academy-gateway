# Telegram Admin Asset Intake Design

Date: 2026-05-19

## Summary

Add a Telegram-admin-driven asset intake pipeline that lets academy staff post documents, images, audio, and video into a private admin Telegram group, then route those assets into the correct student-facing Obsidian vault surfaces without exposing Telegram mechanics to students.

The design keeps Telegram as the background intake channel, keeps server-side storage lean and metadata-focused, and uses the existing PBG Obsidian dashboard as the clean delivery surface.

## Problem Statement

The academy needs a lightweight operational way to distribute learning assets into the PBG Obsidian experience without manually touching each student vault or turning the VPS into a large media warehouse. Students are already working inside a dedicated PBG vault, and admins already use Telegram heavily.

Without this feature, asset distribution is manual, inconsistent, and harder to target by course, tier, cohort, or student. That creates avoidable ops overhead and makes timely course delivery harder.

## Goals

- Allow academy admins to post assets into a private Telegram admin group and have the system ingest them automatically.
- Route assets to the correct audience using explicit targeting rules.
- Write or sync delivered assets into the correct `PBG` vault structure so students can use them locally.
- Surface delivered assets in the Obsidian dashboard through clean cards/buttons rather than exposing Telegram internals.
- Keep server-side storage limited to routing, approval, sync, and audit metadata rather than becoming a large asset warehouse.

## Non-Goals

- Do not turn the Obsidian dashboard into a Telegram media browser.
- Do not expose Telegram messages, prompts, bot mechanics, or raw workflow internals to students.
- Do not build a full digital asset management system in this slice.
- Do not support arbitrary vault-wide delivery outside academy-scoped folders.
- Do not make the VPS the long-term source of truth for full student media libraries unless future requirements force that change.

## Core Design

### 1. Intake Model

A private admin Telegram group is used as the intake channel for academy assets.

Flow:
1. Admin posts an asset into the private Telegram admin group.
2. Telegram bot receives the message and fetches Telegram file metadata.
3. n8n orchestrates ingestion and extracts the target routing information.
4. The asset enters either:
   - `auto-deliver`
   - `pending approval`
5. Once approved or auto-routed, the asset is delivered into the appropriate academy vault path(s).
6. The Obsidian dashboard surfaces the delivered asset through a context-appropriate UI element.

Telegram is purely a background intake pipe. Students do not interact with Telegram through the dashboard for this feature.

### 2. Targeting Model

Assets are distributed by rules, not by a simple global/per-student split.

Supported targeting dimensions:
- `Global`
- `Course-targeted`
- `Tier-targeted`
- `Cohort-targeted`
- `Student-targeted`

Assets may combine these rules where appropriate. Example:
- Course: `Article 9 Foundations`
- Tier: `Pro` and `Ultra`
- Cohort: `Summer-2026`
- Student override: optional

The targeting engine should resolve the final audience before delivery.

### 3. Delivery Modes

Each asset is assigned one of two delivery modes:
- `auto`
- `approval-required`

Use `auto` for routine, low-risk academy content.
Use `approval-required` for sensitive, expensive, or easy-to-misroute assets.

Each asset also gets a lifecycle state:
- `pending`
- `approved`
- `delivered`
- `failed`

### 4. Vault Delivery Paths

Delivered assets should remain academy-scoped and land in known folders only.

Recommended initial destinations:
- `PBG/Courses/...`
- `PBG/Assignments/...`
- `PBG/Resources/...`

Suggested routing behavior:
- Course materials -> `PBG/Courses/...`
- Assignment-specific supporting assets -> `PBG/Assignments/...`
- Shared references and reusable media -> `PBG/Resources/...`

The plugin should treat these as academy-managed content locations and surface them in the dashboard accordingly.

### 5. Dashboard Surface

The dashboard should expose delivered assets as academy content, not as Telegram artifacts.

Possible surfaces:
- asset cards in course views
- asset cards in assignment views
- `new resource` buttons
- contextual file launchers
- unseen/new markers until opened

The first version should show:
- asset title
- asset type
- target context
- new/unseen state when applicable
- open action

The student sees a polished academy UI, not Telegram plumbing.

### 6. Admin Metadata Entry

Freeform Telegram captions alone are too brittle for routing.

The first version should use a structured metadata approach, either:
- structured caption tokens
- or a small n8n routing/approval form after intake

Recommended MVP:
- structured caption for routine auto-delivery
- n8n review form for approval-required assets

Suggested metadata fields:
- `title`
- `asset_type`
- `target_course`
- `target_tier`
- `target_cohort`
- `student_override`
- `delivery_mode`

### 7. Storage Boundary

The system should avoid becoming a large server-side warehouse.

Design boundary:
- Telegram remains the upstream media source.
- The backend stores only the minimum metadata needed for routing, approval, sync tracking, and audit.
- The student-facing working copy lives in the vault.

Remote metadata should include:
- asset id
- Telegram message id
- Telegram file id
- source group id
- file name
- media type
- routing metadata
- approval state
- delivery state
- delivered vault path(s)
- timestamps
- optional failure reason

Long-form media should not be unnecessarily duplicated server-side unless later operational needs require a controlled storage tier.

## Requirements

### Must-Have (P0)

- Telegram bot can ingest document/image/audio/video posts from the private admin group.
- Intake workflow can capture structured routing metadata.
- Assets can be assigned `auto` or `approval-required` delivery mode.
- Targeting supports at least:
  - course
  - tier
  - optional student override
- Delivery writes assets into academy-scoped vault paths only.
- Dashboard can surface delivered assets through clean open actions.
- Server stores only lightweight metadata and delivery state.
- Failure states are captured with visible delivery status for admins.

### Nice-to-Have (P1)

- Cohort targeting in v1.1 if not included immediately.
- Unseen/new markers until the student opens the asset.
- Thumbnail/preview support for image/PDF assets.
- Batch approval for pending assets.
- Automatic de-duplication of reposted Telegram files.

### Future Considerations (P2)

- Full admin asset routing UI outside Telegram.
- Delivery revocation and asset expiry rules.
- Asset versioning and replacement behavior.
- Shared academy asset catalogs by course.
- Rich in-dashboard media previews.

## User Stories

- As an academy admin, I want to drop a file into a private Telegram group so that I can start distribution from the tools I already use.
- As an academy admin, I want to target an asset by course, tier, cohort, or student so that only the right students receive it.
- As an academy admin, I want some assets to auto-deliver and others to require approval so that I can balance speed and control.
- As a student, I want new academy materials to appear in my PBG vault and dashboard so that I can use them without leaving Obsidian.
- As a student, I want the dashboard to show clean asset buttons and cards so that I can open materials without seeing backend workflow details.
- As an operator, I want delivery failures recorded with enough metadata to debug them so that broken asset distribution does not become silent.

## Data Flow

1. Admin posts asset in private Telegram admin group.
2. Bot receives message and identifies media payload.
3. n8n workflow fetches media metadata and routing metadata.
4. Routing engine resolves audience.
5. Asset enters `pending` or `auto` path.
6. Delivery job writes asset into matching vault sync destination(s).
7. Plugin sync or manifest mechanism surfaces the asset in the relevant dashboard context.
8. Student opens asset from the dashboard or vault.

## Error Handling

- If Telegram file fetch fails:
  - mark asset `failed`
  - record failure reason
- If metadata is incomplete:
  - route to `pending approval`
  - do not auto-deliver
- If target audience resolves to zero students:
  - mark as `failed` or `pending-review` based on policy
- If vault delivery fails for a specific target:
  - record per-target failure status
  - do not silently discard
- If a student is not entitled to the target course/tier:
  - skip delivery and record the entitlement mismatch

## Testing Strategy

- Unit tests for routing-rule resolution.
- Unit tests for vault destination mapping.
- Integration tests for Telegram metadata to delivery-state transformation.
- Integration tests for approval vs auto-delivery behavior.
- Plugin tests for dashboard asset-card rendering and open actions.
- Live verification in the PBG test vault with at least one document and one image.

## Success Metrics

### Leading Indicators
- % of admin-posted assets successfully ingested
- % of assets correctly routed on first pass
- median time from Telegram post to vault availability
- % of delivered assets opened by students from the dashboard

### Lagging Indicators
- reduction in manual asset distribution work
- reduction in admin follow-up needed for missed materials
- increased use of dashboard-based content entry points

## Open Questions

- Should large video/audio assets be copied fully into each student vault or linked through a lighter delivery model?
- Should approval state live only in n8n workflow state or also in the academy database metadata layer?
- How should re-posted or updated Telegram assets map to existing delivered files: duplicate, replace, or version?
- Should courses and tiers be selected through structured caption tokens first, or should we prioritize a small admin routing form immediately?

## Timeline Considerations

This feature should be built as a separate delivery pipeline slice, not folded into the discussion badge flow. It depends on:
- the existing Telegram bot connection
- n8n workflow execution
- academy targeting data already available or to be made queryable
- the plugin’s existing academy-scoped vault content model

The first implementation can ship without previews, versioning, or rich admin UX as long as the intake, routing, vault delivery, and dashboard surfacing are reliable.
