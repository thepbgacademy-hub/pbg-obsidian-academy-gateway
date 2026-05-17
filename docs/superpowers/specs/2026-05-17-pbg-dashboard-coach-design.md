# PBG Dashboard Coach Design

Last updated: `2026-05-17`

## Purpose

This spec defines the first MVP design for the `Coach` area at the bottom of the `PBG Academy` dashboard.

The goal is to give the student an academy-scoped coaching surface that:

- uses the student's own connected LLM provider
- charges separate PBG academy credits per action
- keeps the coaching experience product-like and clean
- stores substantive outputs locally in the student's PBG vault
- keeps remote database growth lean and controlled

## Product Positioning

The feature should be called `Coach`, not `Tutor`.

Reasoning:

- `Coach` feels more positive and performance-oriented
- it better matches the academy tone
- it avoids the remedial feeling that `Tutor` can sometimes imply

## Placement

The `Coach` area lives at the very bottom of the dashboard.

This makes it the action floor of the classroom:

- upper dashboard = overview, assignments, metrics, navigation
- bottom dashboard = coaching, research, and report generation

## Scope

The MVP supports:

- in-panel coaching chat
- in-panel research responses
- report generation to the vault
- explicit PBG credit charging by mode
- use of the student's connected provider account
- academy-scoped context only

The MVP does not support:

- showing prompts, skills, or workflow names to the student
- exposing backend execution steps
- full multimodal attachments inside the panel
- full server-side transcript warehousing

## Provider Model

Supported providers:

- `OpenAI`
- `Anthropic API`
- `Grok API`
- `Gemini API`
- `OpenRouter`

Presentation rules:

- `OpenAI` should be presented as the easiest recommended path if the student already has a subscription
- all supported providers remain available as alternatives
- provider cost belongs to the student and is separate from PBG credits

## Billing Boundary

The system must clearly separate:

1. student LLM provider costs
2. PBG academy bot credit costs

The dashboard should show both states in a quiet, compact way.

Examples:

- provider connected / not connected
- PBG credit balance
- selected action cost

The student should never confuse their personal provider billing with academy credit consumption.

## Coach Modes

The coach panel uses a progressive button layout instead of a dropdown.

### Primary row

- `Coach 2`
- `Research`
- `Reports`

### Secondary row

Shown only when relevant.

If `Research` is selected:

- `Standard 5`
- `Deep 8`

If `Reports` is selected:

- `Basic PDF 10`
- `Expanded PDF + MD 15`

## Credit Model

Fixed mode pricing for MVP:

- `Coach`: `2` credits
- `Research Standard`: `5` credits
- `Research Deep`: `8` credits
- `Basic PDF Report`: `10` credits
- `Expanded PDF + MD Report`: `15` credits

Rule:

- pricing is based on the explicit mode the student selected
- pricing must not be inferred from hidden complexity

This keeps billing understandable and support-friendly.

## Hidden Workflow Boundary

Each visible action maps to academy-owned prompts and workflows behind the scenes.

The student must never see:

- raw prompts
- skill names
- workflow names
- orchestration chains
- backend status text such as:
  - calling a skill
  - querying LightRAG
  - compiling PDF
  - running a hidden chain

The student should only see:

- the selected mode
- the credit cost
- a concise working state
- the result or completion notice

Allowed product-facing wording:

- `Working...`
- `Generating report...`
- `Expanded report complete`
- `Saved to PBG/Reports/...`

## Context Model

The coach operates only on academy-scoped materials.

Default context includes:

- current course or assignment target
- related approved academy files
- academy-designated folders/tags only

Approved scope includes:

- `PBG/`
- `Courses/`
- `Assignments/`
- academy-tagged content such as `#academy`

The MVP should not require the student to hand-pick files on every turn.

The panel should show a small context indicator, for example:

- `Context: Assignment + related academy materials`
- `Using 4 academy files`

## Thread Model

The system should use one coach thread per course or assignment context.

Examples:

- `course:<course-id>`
- `assignment:<assignment-id>`

This prevents one giant mixed thread and keeps the coaching tied to actual study context.

## Storage Model

Use a hybrid storage model with tight limits on remote growth.

### Local vault storage

Readable content stays local.

Store in the vault:

- one markdown note per coach thread
- report artifacts
- expanded report markdown companion file when applicable

Recommended vault structure:

- `PBG/Coach Threads/`
- `PBG/Reports/`

### Remote database storage

Store only minimal metadata such as:

- `student_id`
- `thread_id`
- `context_type`
- `context_id`
- `provider`
- `mode`
- `turn_count`
- `credits_debited`
- timestamps
- optional tiny status/summary only if operationally necessary

Do not store long-form chat transcripts remotely in the MVP.

This keeps the VPS side from becoming bloated.

## Output Behavior

### Coach and Research

Behavior:

- response appears inside the coach panel
- response appends to the thread markdown note in `PBG/Coach Threads/`

### Reports

Behavior:

- do not render the full report body inside the coach panel
- save report artifacts directly to `PBG/Reports/`
- show a concise completion notice in the panel

For `Expanded PDF + MD`:

- create the PDF artifact
- create the markdown companion artifact
- show completion status plus saved paths

Example outcome message:

- `Expanded report complete`
- `Saved to PBG/Reports/...`
- `MD companion created`

## Status / Accounting Card

The coach region should include a compact status card or status strip showing:

- provider connection state
- PBG credit balance
- selected action cost
- current context target

This should remain lightweight, not a financial dashboard.

## Failure States

Use inline blocking, not intrusive popups.

### Missing provider connection

- block action
- explain that a provider connection is required
- show available provider choices or connection prompt

### Insufficient PBG credits

- block action
- explain that more academy credits are required for the selected action

### Missing valid context target

- block action
- explain that a course or assignment context is required

Example messages:

- `Connect a provider to use Coach`
- `You need more PBG credits for this action`
- `Open a course or assignment context to continue`

## UI Shape

Recommended MVP structure inside the bottom dashboard area:

- `Coach` header
- status/accounting strip
- primary mode row
- contextual secondary mode row when needed
- transcript/result area
- prompt box
- send / run action button
- inline blocked state when not ready

The interface should remain calm and dense enough for classroom use.

## Data And Integration Boundaries

### Student-owned provider

The student supplies or connects their own provider account.

### Academy-owned workflows

The academy owns:

- prompts
- workflow routing
- mode definitions
- credit charging rules
- workflow outputs

### Academy credits

PBG credits are consumed by coach actions even though the underlying LLM provider belongs to the student.

## Security And Product Rules

- coach must remain academy-scoped
- do not leak prompts or internal workflow logic to students
- keep remote storage minimal
- avoid turning the dashboard into a general-purpose chat app
- preserve the clean billing boundary between provider usage and PBG credits

## Success Criteria

The MVP is successful when a student can:

1. connect a supported provider
2. see their PBG credit balance
3. choose a visible coach mode with explicit cost
4. ask a coaching or research question using academy-scoped context
5. receive a clean result without backend internals being exposed
6. generate reports directly into the PBG vault
7. review their thread history locally in `PBG/Coach Threads/`

## Related Docs

- `C:\tmp\pbg-obsidian-academy-gateway-work\docs\current-build-state.md`
- `C:\tmp\pbg-obsidian-academy-gateway-work\docs\dashboard-feature-map.md`
- `C:\tmp\pbg-obsidian-academy-gateway-work\docs\telegram-discussion-admin.md`
- `C:\tmp\pbg-obsidian-academy-gateway-work\docs\superpowers\specs\2026-05-15-pbg-hermes-layout-adaptation-design.md`
- `C:\tmp\pbg-obsidian-academy-gateway-work\docs\superpowers\specs\2026-05-15-pbg-discussion-badge-design.md`
