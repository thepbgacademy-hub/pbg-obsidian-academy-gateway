# PBG Hermes Layout Adaptation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reshape the Obsidian dashboard into a Hermes-inspired shell with an academy header, left rail, hidden future regions behind flags, and a polling-based announcement banner contract while preserving existing academy dashboard content.

**Architecture:** Keep the implementation local to the Obsidian plugin. Introduce a small shell model, local feature flags, banner polling/client state, and academy-specific render helpers instead of pulling Hermes web code directly. Preserve the existing local dashboard metrics pipeline and wrap it in the new shell. Add the remote announcement contract to the gateway in a minimal, testable way.

**Tech Stack:** TypeScript, Obsidian plugin API, Fastify gateway, Vitest, esbuild

---

## File Structure

### Existing files to modify

- `packages/obsidian-plugin/src/dashboardView.ts`
  Responsibility: top-level Obsidian dashboard view and shell composition.
- `packages/obsidian-plugin/src/localState.ts`
  Responsibility: local vault-derived dashboard state; will remain the source for academy classroom content.
- `packages/obsidian-plugin/src/apiClient.ts`
  Responsibility: gateway client methods; add announcement polling fetch contract here.
- `packages/obsidian-plugin/src/settings.ts`
  Responsibility: plugin configuration defaults; may hold polling interval defaults if needed.
- `packages/obsidian-plugin/styles.css`
  Responsibility: dashboard shell layout and visual treatment.
- `packages/gateway-api/src/app.ts`
  Responsibility: add minimal announcement endpoint returning placeholder/seeded data.
- `packages/shared/src/contracts.ts`
  Responsibility: shared route constant for dashboard announcements.

### New files to create

- `packages/obsidian-plugin/src/dashboardFlags.ts`
  Responsibility: local feature flags for academy-visible vs hidden Hermes-derived regions.
- `packages/obsidian-plugin/src/dashboardShell.ts`
  Responsibility: render helpers and data types for academy header, left rail, hidden panels, and main workspace shell.
- `packages/obsidian-plugin/src/announcements.ts`
  Responsibility: announcement polling state, blink-cycle logic, and normalization helpers.
- `packages/obsidian-plugin/tests/dashboardFlags.test.ts`
  Responsibility: verify flag defaults and hidden-region behavior.
- `packages/obsidian-plugin/tests/dashboardShell.test.ts`
  Responsibility: verify shell sections render and hidden Hermes regions stay hidden by default.
- `packages/obsidian-plugin/tests/announcements.test.ts`
  Responsibility: verify polling merge logic and three-blink attention cycle behavior.
- `packages/gateway-api/tests/dashboardAnnouncements.test.ts`
  Responsibility: verify the gateway announcement route contract.

### Existing tests to extend

- `packages/obsidian-plugin/tests/apiClient.test.ts`
  Responsibility: add announcement fetch contract tests.
- `packages/shared/tests/contracts.test.ts`
  Responsibility: add route constant coverage.

---

### Task 1: Add Shared Announcement Route Contract

**Files:**
- Modify: `packages/shared/src/contracts.ts`
- Test: `packages/shared/tests/contracts.test.ts`

- [ ] **Step 1: Write the failing shared-contract test**

```typescript
import { describe, expect, it } from "vitest";
import { API_ROUTES } from "../src/contracts.js";

describe("shared API contracts", () => {
  it("includes the dashboard announcements route", () => {
    expect(API_ROUTES.dashboardAnnouncements).toBe("/api/dashboard/announcements");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- packages/shared/tests/contracts.test.ts`
Expected: FAIL because `dashboardAnnouncements` is missing.

- [ ] **Step 3: Add the shared route**

```typescript
export const API_ROUTES = {
  authLogin: "/api/auth/login",
  authRefresh: "/api/auth/refresh",
  authLogout: "/api/auth/logout",
  deviceRegister: "/api/devices/register",
  dashboardMe: "/api/dashboard/me",
  dashboardAnnouncements: "/api/dashboard/announcements",
  courseManifest: "/api/courses/manifest",
  assignmentCoachPreview: "/api/workflows/assignment-coach/preview",
  assignmentCoachRun: "/api/workflows/assignment-coach/run",
  workflowRun: "/api/workflows/runs/:runId"
} as const;
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- packages/shared/tests/contracts.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add packages/shared/src/contracts.ts packages/shared/tests/contracts.test.ts
git commit -m "feat: add dashboard announcements route contract"
```

---

### Task 2: Add Minimal Gateway Announcement Endpoint

**Files:**
- Modify: `packages/gateway-api/src/app.ts`
- Test: `packages/gateway-api/tests/dashboardAnnouncements.test.ts`

- [ ] **Step 1: Write the failing gateway test**

```typescript
import { describe, expect, it } from "vitest";
import { API_ROUTES } from "@pbg/shared/contracts";
import { buildApp } from "../src/app.js";

describe("dashboard announcement route", () => {
  it("returns active academy announcements for authenticated requests", async () => {
    const app = buildApp();

    const login = await app.inject({
      method: "POST",
      url: API_ROUTES.authLogin,
      payload: {
        username: "pbg_test_student",
        password: "pbg-test-password",
        vaultId: "sha256-vault-id",
        deviceFingerprint: "sha256-device-fingerprint",
        pluginVersion: "0.1.0"
      }
    });

    const { accessToken } = login.json<{ accessToken: string }>();

    const response = await app.inject({
      method: "GET",
      url: API_ROUTES.dashboardAnnouncements,
      headers: {
        authorization: `Bearer ${accessToken}`
      }
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({
      items: [
        {
          id: "academy-announcement-orientation",
          label: "Academy Update",
          text: "Orientation week resources are now live in your PBG vault.",
          href: "https://example.invalid/academy/orientation",
          publishedAt: "2026-05-15T00:00:00.000Z",
          expiresAt: null,
          isActive: true
        }
      ]
    });

    await app.close();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- packages/gateway-api/tests/dashboardAnnouncements.test.ts`
Expected: FAIL because the route does not exist.

- [ ] **Step 3: Add the minimal authenticated endpoint**

```typescript
app.get(API_ROUTES.dashboardAnnouncements, { preHandler: requireAuth }, async () => ({
  items: [
    {
      id: "academy-announcement-orientation",
      label: "Academy Update",
      text: "Orientation week resources are now live in your PBG vault.",
      href: "https://example.invalid/academy/orientation",
      publishedAt: "2026-05-15T00:00:00.000Z",
      expiresAt: null,
      isActive: true
    }
  ]
}));
```

- [ ] **Step 4: Run the gateway test**

Run: `npm test -- packages/gateway-api/tests/dashboardAnnouncements.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add packages/gateway-api/src/app.ts packages/gateway-api/tests/dashboardAnnouncements.test.ts
git commit -m "feat: add dashboard announcement endpoint"
```

---

### Task 3: Add Plugin Feature Flags For Hidden Hermes Regions

**Files:**
- Create: `packages/obsidian-plugin/src/dashboardFlags.ts`
- Test: `packages/obsidian-plugin/tests/dashboardFlags.test.ts`

- [ ] **Step 1: Write the failing flag test**

```typescript
import { describe, expect, it } from "vitest";
import { DEFAULT_DASHBOARD_FLAGS } from "../src/dashboardFlags.js";

describe("dashboard flags", () => {
  it("enables the academy banner and hides Hermes-derived regions by default", () => {
    expect(DEFAULT_DASHBOARD_FLAGS).toEqual({
      showAcademyAnnouncementBanner: true,
      showHermesShellExtras: false,
      showHermesSidebarTools: false,
      showHermesSecondaryPanels: false
    });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- packages/obsidian-plugin/tests/dashboardFlags.test.ts`
Expected: FAIL because the file does not exist.

- [ ] **Step 3: Add the flag module**

```typescript
export interface DashboardFlags {
  showAcademyAnnouncementBanner: boolean;
  showHermesShellExtras: boolean;
  showHermesSidebarTools: boolean;
  showHermesSecondaryPanels: boolean;
}

export const DEFAULT_DASHBOARD_FLAGS: DashboardFlags = {
  showAcademyAnnouncementBanner: true,
  showHermesShellExtras: false,
  showHermesSidebarTools: false,
  showHermesSecondaryPanels: false
};
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- packages/obsidian-plugin/tests/dashboardFlags.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add packages/obsidian-plugin/src/dashboardFlags.ts packages/obsidian-plugin/tests/dashboardFlags.test.ts
git commit -m "feat: add dashboard feature flags"
```

---

### Task 4: Add Announcement Polling State And Blink Logic

**Files:**
- Create: `packages/obsidian-plugin/src/announcements.ts`
- Test: `packages/obsidian-plugin/tests/announcements.test.ts`

- [ ] **Step 1: Write the failing polling/blink tests**

```typescript
import { describe, expect, it } from "vitest";
import {
  createAnnouncementViewState,
  mergeAnnouncementPayload
} from "../src/announcements.js";

describe("announcement state", () => {
  it("creates an empty idle banner state", () => {
    expect(createAnnouncementViewState()).toEqual({
      items: [],
      activeItemIndex: 0,
      shouldBlink: false,
      lastSeenAnnouncementId: null
    });
  });

  it("enables blink when a new announcement arrives", () => {
    const next = mergeAnnouncementPayload(createAnnouncementViewState(), {
      items: [
        {
          id: "academy-announcement-orientation",
          label: "Academy Update",
          text: "Orientation week resources are now live in your PBG vault.",
          href: "https://example.invalid/academy/orientation",
          publishedAt: "2026-05-15T00:00:00.000Z",
          expiresAt: null,
          isActive: true
        }
      ]
    });

    expect(next.shouldBlink).toBe(true);
    expect(next.lastSeenAnnouncementId).toBe("academy-announcement-orientation");
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- packages/obsidian-plugin/tests/announcements.test.ts`
Expected: FAIL because the module does not exist.

- [ ] **Step 3: Add the minimal announcement state module**

```typescript
export interface DashboardAnnouncementItem {
  id: string;
  label: string;
  text: string;
  href: string;
  publishedAt: string;
  expiresAt: string | null;
  isActive: boolean;
}

export interface DashboardAnnouncementsPayload {
  items: DashboardAnnouncementItem[];
}

export interface AnnouncementViewState {
  items: DashboardAnnouncementItem[];
  activeItemIndex: number;
  shouldBlink: boolean;
  lastSeenAnnouncementId: string | null;
}

export function createAnnouncementViewState(): AnnouncementViewState {
  return {
    items: [],
    activeItemIndex: 0,
    shouldBlink: false,
    lastSeenAnnouncementId: null
  };
}

export function mergeAnnouncementPayload(
  previous: AnnouncementViewState,
  payload: DashboardAnnouncementsPayload
): AnnouncementViewState {
  const firstId = payload.items[0]?.id ?? null;
  const isNew = firstId !== null && firstId !== previous.lastSeenAnnouncementId;

  return {
    items: payload.items.filter((item) => item.isActive),
    activeItemIndex: 0,
    shouldBlink: isNew,
    lastSeenAnnouncementId: firstId
  };
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- packages/obsidian-plugin/tests/announcements.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add packages/obsidian-plugin/src/announcements.ts packages/obsidian-plugin/tests/announcements.test.ts
git commit -m "feat: add announcement polling state"
```

---

### Task 5: Add Gateway Client Support For Announcements

**Files:**
- Modify: `packages/obsidian-plugin/src/apiClient.ts`
- Modify: `packages/obsidian-plugin/tests/apiClient.test.ts`

- [ ] **Step 1: Write the failing API client test**

```typescript
it("fetches academy announcement items from the gateway", async () => {
  const client = new PbgGatewayApiClient(
    "http://localhost:8787",
    createMockFetch([
      {
        ok: true,
        json: async () => ({
          items: [
            {
              id: "academy-announcement-orientation",
              label: "Academy Update",
              text: "Orientation week resources are now live in your PBG vault.",
              href: "https://example.invalid/academy/orientation",
              publishedAt: "2026-05-15T00:00:00.000Z",
              expiresAt: null,
              isActive: true
            }
          ]
        })
      }
    ]),
    "short-lived-token"
  );

  const result = await client.getDashboardAnnouncements();

  expect(result.items).toHaveLength(1);
  expect(result.items[0]?.id).toBe("academy-announcement-orientation");
});
```

- [ ] **Step 2: Run the client test to verify it fails**

Run: `npm test -- packages/obsidian-plugin/tests/apiClient.test.ts`
Expected: FAIL because `getDashboardAnnouncements` is missing.

- [ ] **Step 3: Add the client method**

```typescript
import type { DashboardAnnouncementsPayload } from "./announcements.js";

async getDashboardAnnouncements(): Promise<DashboardAnnouncementsPayload> {
  return this.requestJson<DashboardAnnouncementsPayload>(API_ROUTES.dashboardAnnouncements);
}
```

- [ ] **Step 4: Run the client test**

Run: `npm test -- packages/obsidian-plugin/tests/apiClient.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add packages/obsidian-plugin/src/apiClient.ts packages/obsidian-plugin/tests/apiClient.test.ts
git commit -m "feat: add dashboard announcement client"
```

---

### Task 6: Add Hermes-Inspired Shell Renderer

**Files:**
- Create: `packages/obsidian-plugin/src/dashboardShell.ts`
- Test: `packages/obsidian-plugin/tests/dashboardShell.test.ts`

- [ ] **Step 1: Write the failing shell test**

```typescript
import { describe, expect, it } from "vitest";
import { createDashboardShellModel } from "../src/dashboardShell.js";
import { DEFAULT_DASHBOARD_FLAGS } from "../src/dashboardFlags.js";
import { computeLocalPbgDashboardState } from "../src/localState.js";

describe("dashboard shell model", () => {
  it("keeps Hermes-derived extras hidden by default", () => {
    const localState = computeLocalPbgDashboardState([]);
    const shell = createDashboardShellModel(localState, DEFAULT_DASHBOARD_FLAGS);

    expect(shell.leftRail.items.map((item) => item.label)).toEqual([
      "Dashboard",
      "Courses",
      "Assignments",
      "Workflows",
      "Results"
    ]);
    expect(shell.hiddenSections.showHermesShellExtras).toBe(false);
    expect(shell.hiddenSections.showHermesSidebarTools).toBe(false);
    expect(shell.hiddenSections.showHermesSecondaryPanels).toBe(false);
  });
});
```

- [ ] **Step 2: Run the shell test to verify it fails**

Run: `npm test -- packages/obsidian-plugin/tests/dashboardShell.test.ts`
Expected: FAIL because the shell module does not exist.

- [ ] **Step 3: Add a minimal shell model**

```typescript
import type { DashboardFlags } from "./dashboardFlags.js";
import type { AnnouncementViewState } from "./announcements.js";
import type { LocalPbgDashboardState } from "./localState.js";

export interface DashboardShellModel {
  header: {
    title: string;
    subtitle: string;
    announcementBannerEnabled: boolean;
    announcements?: AnnouncementViewState;
  };
  leftRail: {
    items: Array<{ id: string; label: string }>;
  };
  hiddenSections: {
    showHermesShellExtras: boolean;
    showHermesSidebarTools: boolean;
    showHermesSecondaryPanels: boolean;
  };
  main: LocalPbgDashboardState;
}

export function createDashboardShellModel(
  localState: LocalPbgDashboardState,
  flags: DashboardFlags,
  announcements?: AnnouncementViewState
): DashboardShellModel {
  return {
    header: {
      title: "PBG Academy",
      subtitle: "Local academy workspace",
      announcementBannerEnabled: flags.showAcademyAnnouncementBanner,
      announcements
    },
    leftRail: {
      items: [
        { id: "dashboard", label: "Dashboard" },
        { id: "courses", label: "Courses" },
        { id: "assignments", label: "Assignments" },
        { id: "workflows", label: "Workflows" },
        { id: "results", label: "Results" }
      ]
    },
    hiddenSections: {
      showHermesShellExtras: flags.showHermesShellExtras,
      showHermesSidebarTools: flags.showHermesSidebarTools,
      showHermesSecondaryPanels: flags.showHermesSecondaryPanels
    },
    main: localState
  };
}
```

- [ ] **Step 4: Run the shell test**

Run: `npm test -- packages/obsidian-plugin/tests/dashboardShell.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add packages/obsidian-plugin/src/dashboardShell.ts packages/obsidian-plugin/tests/dashboardShell.test.ts
git commit -m "feat: add dashboard shell model"
```

---

### Task 7: Restructure Dashboard View Into Academy Shell

**Files:**
- Modify: `packages/obsidian-plugin/src/dashboardView.ts`
- Modify: `packages/obsidian-plugin/src/localState.ts`
- Modify: `packages/obsidian-plugin/styles.css`
- Test: `packages/obsidian-plugin/tests/localState.test.ts`

- [ ] **Step 1: Write the failing local-state test for shell content**

```typescript
it("keeps local classroom state intact for shell rendering", () => {
  const state = computeLocalPbgDashboardState([
    {
      path: "PBG/Assignments/connect-first-workflow.md",
      body: "# Connect First Workflow\n\n- [ ] Draft a workflow reflection\n"
    }
  ]);

  expect(state.currentFocus?.title).toBe("Connect First Workflow");
  expect(state.todos[0]?.text).toBe("Draft a workflow reflection");
});
```

- [ ] **Step 2: Run the local state test**

Run: `npm test -- packages/obsidian-plugin/tests/localState.test.ts`
Expected: PASS or remain green. This is a guardrail before the shell rewrite.

- [ ] **Step 3: Rewrite the dashboard view around the shell**

Update `dashboardView.ts` so it:

- computes local state
- builds shell model from flags
- keeps workflow actions explicit click-only
- renders:
  - academy header
  - placeholder left rail
  - main workspace cards
  - hidden Hermes sections only when flags allow

Key render structure:

```typescript
const shell = createDashboardShellModel(localState, DEFAULT_DASHBOARD_FLAGS, announcementState);

container.createDiv({ cls: "pbg-shell" });
```

Within the shell:

- `pbg-shell__header`
- `pbg-shell__banner`
- `pbg-shell__body`
- `pbg-shell__rail`
- `pbg-shell__main`

- [ ] **Step 4: Add shell CSS**

Add layout rules in `styles.css` for:

- a fixed-feeling header band
- left rail width and spacing
- main content grid
- quiet announcement banner strip
- mobile fallback to stacked layout

Use academy-facing naming only, for example:

```css
.pbg-shell { ... }
.pbg-shell__header { ... }
.pbg-shell__banner { ... }
.pbg-shell__body { ... }
.pbg-shell__rail { ... }
.pbg-shell__main { ... }
```

- [ ] **Step 5: Run focused plugin tests**

Run: `npm test -- packages/obsidian-plugin/tests/localState.test.ts packages/obsidian-plugin/tests/dashboardShell.test.ts`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add packages/obsidian-plugin/src/dashboardView.ts packages/obsidian-plugin/src/localState.ts packages/obsidian-plugin/styles.css packages/obsidian-plugin/tests/localState.test.ts
git commit -m "feat: adapt dashboard to academy shell"
```

---

### Task 8: Wire Announcement Polling Into The Dashboard View

**Files:**
- Modify: `packages/obsidian-plugin/src/dashboardView.ts`
- Modify: `packages/obsidian-plugin/src/announcements.ts`
- Test: `packages/obsidian-plugin/tests/announcements.test.ts`

- [ ] **Step 1: Extend the announcement tests for repeated payload merge**

```typescript
it("does not retrigger blink for the same leading announcement id", () => {
  const first = mergeAnnouncementPayload(createAnnouncementViewState(), {
    items: [
      {
        id: "academy-announcement-orientation",
        label: "Academy Update",
        text: "Orientation week resources are now live in your PBG vault.",
        href: "https://example.invalid/academy/orientation",
        publishedAt: "2026-05-15T00:00:00.000Z",
        expiresAt: null,
        isActive: true
      }
    ]
  });

  const second = mergeAnnouncementPayload(first, {
    items: first.items
  });

  expect(second.shouldBlink).toBe(false);
});
```

- [ ] **Step 2: Run the announcement tests**

Run: `npm test -- packages/obsidian-plugin/tests/announcements.test.ts`
Expected: FAIL until merge logic is updated.

- [ ] **Step 3: Add stable polling merge behavior**

Update `mergeAnnouncementPayload` so blink only fires when the leading active announcement changes.

Then in `dashboardView.ts`, add:

- initial announcement fetch on open
- interval polling
- cleanup on close
- shell re-render on new payload

Use a conservative constant:

```typescript
const ANNOUNCEMENT_POLL_INTERVAL_MS = 60_000;
```

- [ ] **Step 4: Run the announcement tests**

Run: `npm test -- packages/obsidian-plugin/tests/announcements.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add packages/obsidian-plugin/src/dashboardView.ts packages/obsidian-plugin/src/announcements.ts packages/obsidian-plugin/tests/announcements.test.ts
git commit -m "feat: add announcement polling to dashboard"
```

---

### Task 9: Add Banner Link Rendering And Blink Styling

**Files:**
- Modify: `packages/obsidian-plugin/src/dashboardView.ts`
- Modify: `packages/obsidian-plugin/styles.css`

- [ ] **Step 1: Add a focused render assertion in the shell test**

```typescript
it("enables the academy banner region by default", () => {
  const localState = computeLocalPbgDashboardState([]);
  const shell = createDashboardShellModel(localState, DEFAULT_DASHBOARD_FLAGS, {
    items: [
      {
        id: "academy-announcement-orientation",
        label: "Academy Update",
        text: "Orientation week resources are now live in your PBG vault.",
        href: "https://example.invalid/academy/orientation",
        publishedAt: "2026-05-15T00:00:00.000Z",
        expiresAt: null,
        isActive: true
      }
    ],
    activeItemIndex: 0,
    shouldBlink: true,
    lastSeenAnnouncementId: "academy-announcement-orientation"
  });

  expect(shell.header.announcementBannerEnabled).toBe(true);
});
```

- [ ] **Step 2: Run the shell test**

Run: `npm test -- packages/obsidian-plugin/tests/dashboardShell.test.ts`
Expected: PASS or remain green.

- [ ] **Step 3: Render the banner link in the header**

In `dashboardView.ts`, render the first active announcement as a clickable link:

```typescript
const announcement = shell.header.announcements?.items[shell.header.announcements.activeItemIndex];
```

Render:

- label
- text
- link target
- blink class when `shouldBlink === true`

- [ ] **Step 4: Add banner motion styles**

In `styles.css`, add:

- marquee-like horizontal motion
- blink animation class for new announcements
- restrained styling to avoid distraction

Use CSS names like:

```css
.pbg-shell__bannerLink { ... }
.pbg-shell__bannerTrack { ... }
.pbg-shell__bannerBlink { ... }
```

- [ ] **Step 5: Run plugin tests and build**

Run: `npm test -- packages/obsidian-plugin/tests/dashboardShell.test.ts packages/obsidian-plugin/tests/announcements.test.ts`
Expected: PASS

Run: `npm run build`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add packages/obsidian-plugin/src/dashboardView.ts packages/obsidian-plugin/styles.css packages/obsidian-plugin/tests/dashboardShell.test.ts
git commit -m "feat: add academy announcement banner"
```

---

### Task 10: Whole-Feature Verification

**Files:**
- Verify only

- [ ] **Step 1: Run full test suite**

Run: `npm test`
Expected: PASS

- [ ] **Step 2: Run typecheck**

Run: `npm run typecheck`
Expected: PASS

- [ ] **Step 3: Run full build**

Run: `npm run build`
Expected: PASS

- [ ] **Step 4: Run install safety check**

Run: `.\scripts\install-plugin.ps1 -VaultPath "E:\Obsidian\PBG Plug in" -WhatIf`
Expected: WhatIf output only, no writes.

- [ ] **Step 5: Manual verification checklist**

Confirm in Obsidian:

- academy header renders
- left rail renders
- existing local dashboard cards still appear
- banner is visible in header
- banner link is clickable
- no popup notices appear
- hidden Hermes-derived regions remain hidden

- [ ] **Step 6: Final commit**

```bash
git add .
git commit -m "feat: adapt dashboard to Hermes-inspired academy shell"
```

---

## Self-Review

Spec coverage:

- Hermes-inspired middle shell: covered in Tasks 6-7
- academy header: covered in Tasks 6-9
- read-only link-only polling banner: covered in Tasks 2, 4, 5, 8, 9
- hidden Hermes regions behind flags: covered in Tasks 3 and 6
- preserve existing dashboard content: covered in Task 7
- provisional left rail: covered in Task 6

Placeholder scan:

- No `TBD` or deferred implementation placeholders remain in the task steps.

Type consistency:

- Announcement payload fields use `publishedAt` / `expiresAt` consistently in code examples.
- Shell flags and shell section names are consistent across tasks.

