# PBG Obsidian Academy Gateway Design

## Summary

Build a PBG Academy Obsidian plugin that turns a dedicated PBG Vault into a local-first academy dashboard. The plugin runs locally because Obsidian requires installed plugin files, but it acts as a thin gateway to the PBG VPS for authentication, subscription checks, academy credit checks, course updates, and workflow execution.

The first feasibility test should prove the bridge: the plugin loads in a test vault, creates the standard PBG folder structure, authenticates against Academy Core, registers one active vault/device for the student, renders a dashboard shell, syncs entitled course content locally, and runs the first explicit Assignment Coach workflow.

## Goals

- Create a dedicated PBG Vault experience inside Obsidian.
- Keep normal course content local-first to reduce server load and improve responsiveness.
- Gate paid functionality through the VPS using Academy Core subscription, entitlement, and credit records.
- Send note body content to the VPS only after a student explicitly runs a workflow action.
- Enforce one active student account, one registered PBG Vault, and one active device installation for the POC.
- Store only plugin metadata and workflow run metadata in the `pbg_obsidian` schema.
- Use `academy_core.students.id` as the canonical student reference.

## Non-Goals

- Do not store full Obsidian vault contents on the VPS.
- Do not build a cloud data warehouse for student behavior.
- Do not attempt DRM for local markdown files after they are downloaded.
- Do not treat ChatGPT subscription billing and OpenAI API billing as the same thing.
- Do not model raw LLM provider secrets in `academy_core`.
- Do not support multiple active student devices or multiple registered vaults in the POC.

## Architecture

```text
Obsidian PBG Vault
  -> local plugin gateway
  -> PBG VPS API
  -> Supabase/Postgres schemas
       academy_core
       pbg_obsidian
  -> Redis/BullMQ for short-lived workflow jobs
  -> optional n8n workflows later
  -> user-connected model provider credentials
```

The local plugin handles Obsidian integration, the dashboard view, vault structure creation, local course files, local dashboard cache, and explicit workflow requests. The VPS handles login, subscription standing, entitlements, academy credits, course update manifests, protected asset access, workflow routing, and provider connector orchestration.

## Vault Structure

During onboarding, the plugin creates a uniform PBG Vault structure:

```text
PBG/
  Dashboard/
  Courses/
  Assignments/
  Notes/
  Workflow Results/
  Templates/
  System/
    dashboard-state.json
    heatmap-cache.json
    course-manifest-cache.json
```

The plugin should treat this as the supported academy boundary. It may also recognize academy tags such as `#academy`, but the default scope is the managed PBG folder tree.

## Local-First Content

Entitled course, module, lesson, assignment, and template markdown should be downloaded into the PBG Vault. This is the least server-heavy option because the VPS does not need to stream lessons repeatedly or render the dashboard from scratch.

The VPS remains required for:

- login and session refresh
- subscription and good-standing checks
- credit balance checks and deductions
- course update manifests
- protected asset downloads
- workflow execution
- workflow prompt/rule updates

Local content protection is limited. If a student shares their vault folder, another person may read already-downloaded markdown or files outside the plugin. The system can still block paid plugin features, future updates, workflows, protected asset downloads, and account-backed dashboard data.

## Authentication And Device Binding

The POC should use academy username/password login against `academy_core.auth_credentials`. The server verifies the password hash and resolves the account to `academy_core.students.id`.

After login, the VPS returns a short-lived access token and a refresh/device token. The plugin stores tokens in Obsidian plugin settings. Workflow and dashboard calls use the token, not repeated raw username/password checks.

The POC enforces:

```text
one active student -> one registered PBG Vault -> one active device installation
```

The database can be shaped to support multiple devices later, but the API should block a second active device/vault for the same student unless a future "replace registered vault" flow is added.

## Database Boundary

The main Academy Core schema already exists in `E:\Obsidian\main_databse_design`. The plugin schema should be separate:

```text
pbg_obsidian
```

The plugin schema should reference `academy_core.students(id)` through `student_id`.

Recommended POC tables:

```text
pbg_obsidian.plugin_devices
pbg_obsidian.plugin_sessions
pbg_obsidian.workflow_runs
pbg_obsidian.workflow_run_events
pbg_obsidian.saved_result_index
```

`pbg_obsidian` should store plugin-specific metadata only. It should not store raw vault contents, note body payloads, or raw model provider secrets.

`academy_core.credit_ledger.workflow_run_id` can store the `pbg_obsidian.workflow_runs.id` UUID. It does not need a hard foreign key from the existing core migration for the POC.

## Dashboard

The dashboard should feel like an academy command center inside Obsidian. Initial sections:

- current focus
- today priorities
- course path and module progress
- assignments and TODOs
- academy credit balance and subscription standing
- workflow actions
- local activity heatmaps

Dashboard open should not send note body content to the VPS. It may call the VPS for account standing, enabled workflows, course manifest changes, and credit balance. It may read local metadata such as files, folders, tags, frontmatter, task counts, and modified dates within the PBG scope.

## Workflow Order

Workflow implementation order:

1. Assignment Coach
2. Course Companion
3. Progress Reviewer

Assignment Coach is the first POC workflow. The student explicitly selects or opens an assignment note and clicks a workflow action. The plugin previews the context that will be sent, then submits the selected assignment content and limited related academy context to the VPS.

The VPS should:

1. validate the plugin token
2. confirm the student is active and in good standing
3. confirm the required entitlement
4. confirm sufficient academy credits
5. create a workflow run record
6. execute the workflow through the configured provider connector
7. deduct academy credits after the workflow is accepted or completed according to the workflow rule
8. return structured results to the plugin

The plugin should render the result and allow the student to save it locally under `PBG/Workflow Results/`.

## Provider Connectors

The user pays their own LLM provider charges through their own provider connection. The academy subscription unlocks the PBG dashboard, workflows, prompts, rules, course updates, and academy credit usage. Academy credits are separate from provider billing.

The connector model can follow the Hermes-style pattern: the VPS knows which provider connection is available for the student and routes workflows through academy-controlled prompts/rules while using the student-connected provider account.

Provider secrets should not be stored in `academy_core`. If provider credentials are persisted, they belong in a dedicated secure connector layer with encryption and server-only access.

## Security And Privacy

Privacy promise:

```text
PBG Academy receives vault note content only when the student intentionally runs a workflow.
```

The plugin should show a compact context preview before sending note content, such as "Sending 1 assignment note and 2 related course notes."

Security controls:

- one active device/vault per student in the POC
- regular session refresh and standing checks
- server-side entitlement and credit checks for every workflow
- device/vault revocation from the VPS
- no local storage of raw server secrets
- no server retention of full workflow payloads by default

## Feasibility Gates

### Gate 1: Local Plugin Shell

- Install plugin into `E:\Obsidian\PBG Plug in\.obsidian\plugins\pbg-academy-gateway`.
- Obsidian loads the plugin.
- Command opens a PBG Academy dashboard view.
- Plugin creates the standard PBG folder structure.

### Gate 2: Login And Device Registration

- Student logs in with `pbg_test_student` / `pbg-test-password`.
- VPS resolves `student_id = 00000000-0000-4000-8000-000000000101`.
- VPS checks active pro subscription and 250 academy credits.
- VPS registers the active vault/device in `pbg_obsidian`.
- A second active device/vault is blocked for the POC.

### Gate 3: Course Manifest Sync

- Dashboard requests a course update manifest.
- Plugin downloads entitled course, lesson, assignment, and template markdown into the PBG Vault.
- Plugin caches manifest state locally under `PBG/System/`.

### Gate 4: Assignment Coach

- Student opens or selects an assignment note.
- Plugin previews the outbound context.
- Student confirms the workflow action.
- VPS records the workflow run, checks entitlements/credits, executes a stub or real workflow, deducts credits, and returns a structured result.
- Plugin renders the result and can save it locally.

### Gate 5: Dashboard Metrics

- Plugin reads local PBG folder metadata, frontmatter, tags, tasks, and workflow result files.
- Dashboard shows progress cards, TODOs, and simple heatmaps without uploading note bodies.

## Testing

POC testing should cover:

- plugin loads in the test vault
- onboarding creates folders idempotently
- login succeeds with seeded test student
- login fails with bad credentials
- dashboard blocks when subscription standing is bad
- second active device/vault is rejected
- course manifest sync writes expected local files
- assignment workflow sends content only after explicit click
- workflow run metadata is recorded without storing full note content
- credit deduction appears in `academy_core.credit_ledger`
- dashboard remains useful when offline, but workflows are disabled

## Open Decisions

- Exact VPS API framework and route names.
- Whether Redis/BullMQ or n8n executes the first Assignment Coach POC.
- Exact device fingerprint method. It should be privacy-preserving and hashed before storage.
- Whether replacement of a registered vault/device is self-serve or support-controlled.
- Final visual design details for the dashboard.
