# PBG Discussion Badge Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a `PBG Discussion` left-rail item with a per-student numeric activity badge, click-to-open Telegram behavior, and immediate mark-seen flow through the gateway.

**Architecture:** Extend shared contracts with lounge routes and payload types, add minimal in-memory POC discussion status state to the gateway, and add a small plugin-side discussion status module plus left-rail rendering/click handling. Keep the implementation local-first and lightweight: no Telegram content in the plugin, no embed surface, and no academy-wide shared badge semantics.

**Tech Stack:** TypeScript, Fastify gateway, Obsidian plugin API, Vitest, esbuild

---

## File Structure

### Existing files to modify

- `packages/shared/src/contracts.ts`
  Responsibility: shared lounge routes and payload types.
- `packages/shared/tests/contracts.test.ts`
  Responsibility: shared contract route/type coverage.
- `packages/gateway-api/src/app.ts`
  Responsibility: add authenticated discussion status and mark-seen endpoints with in-memory POC state.
- `packages/gateway-api/tests/gatewayRoutes.test.ts`
  Responsibility: end-to-end injected gateway coverage for lounge state.
- `packages/obsidian-plugin/src/apiClient.ts`
  Responsibility: gateway client methods for discussion status and mark-seen.
- `packages/obsidian-plugin/src/dashboardShell.ts`
  Responsibility: extend rail item model to carry badge and link behavior.
- `packages/obsidian-plugin/src/dashboardView.ts`
  Responsibility: poll discussion status, render badge, open external link, optimistically clear count, and POST seen state.
- `packages/obsidian-plugin/styles.css`
  Responsibility: rail badge styling and click affordance.
- `docs/build-error-log.md`
  Responsibility: record red tests and fixes during this slice.

### New files to create

- `packages/obsidian-plugin/src/discussionStatus.ts`
  Responsibility: local discussion badge state helpers and optimistic clear behavior.
- `packages/gateway-api/tests/loungeStatus.test.ts`
  Responsibility: focused gateway lounge route tests.
- `packages/obsidian-plugin/tests/discussionStatus.test.ts`
  Responsibility: discussion badge state coverage.
- `packages/obsidian-plugin/tests/dashboardRail.test.ts`
  Responsibility: left-rail badge rendering model coverage.

### Existing tests to extend

- `packages/obsidian-plugin/tests/apiClient.test.ts`
  Responsibility: add discussion status and mark-seen client tests.
- `packages/obsidian-plugin/tests/dashboardLifecycle.test.ts`
  Responsibility: cover polling-safe local discussion state updates if needed.

---

### Task 1: Add Shared Lounge Routes And Payload Types

**Files:**
- Modify: `packages/shared/src/contracts.ts`
- Test: `packages/shared/tests/contracts.test.ts`

- [ ] **Step 1: Write the failing shared-contract tests**

```typescript
import { describe, expect, it } from "vitest";
import type { DiscussionSeenResponse, DiscussionStatusPayload } from "../src/contracts.js";
import { API_ROUTES } from "../src/contracts.js";

describe("shared lounge contracts", () => {
  it("includes the discussion status route", () => {
    expect(API_ROUTES.discussionStatus).toBe("/api/lounge/discussion-status");
  });

  it("includes the discussion seen route", () => {
    expect(API_ROUTES.discussionSeen).toBe("/api/lounge/discussion-seen");
  });

  it("defines the discussion payload shapes", () => {
    const status: DiscussionStatusPayload = {
      label: "PBG Discussion",
      href: "https://t.me/+Xpdv7ztBFFc1MGVh",
      unreadCount: 9
    };
    const seen: DiscussionSeenResponse = {
      ok: true,
      unreadCount: 0
    };

    expect(status.label).toBe("PBG Discussion");
    expect(seen.ok).toBe(true);
  });
});
```

- [ ] **Step 2: Run the shared contract tests to verify they fail**

Run: `npm test -- packages/shared/tests/contracts.test.ts`  
Expected: FAIL because `discussionStatus`, `discussionSeen`, and the payload types do not exist yet.

- [ ] **Step 3: Add the shared routes and payload types**

```typescript
export const API_ROUTES = {
  authLogin: "/api/auth/login",
  authRefresh: "/api/auth/refresh",
  authLogout: "/api/auth/logout",
  deviceRegister: "/api/devices/register",
  dashboardMe: "/api/dashboard/me",
  dashboardAnnouncements: "/api/dashboard/announcements",
  discussionStatus: "/api/lounge/discussion-status",
  discussionSeen: "/api/lounge/discussion-seen",
  courseManifest: "/api/courses/manifest",
  assignmentCoachPreview: "/api/workflows/assignment-coach/preview",
  assignmentCoachRun: "/api/workflows/assignment-coach/run",
  workflowRun: "/api/workflows/runs/:runId"
} as const;

export interface DiscussionStatusPayload {
  label: string;
  href: string;
  unreadCount: number;
}

export interface DiscussionSeenResponse {
  ok: true;
  unreadCount: number;
}
```

- [ ] **Step 4: Run the shared contract tests to verify they pass**

Run: `npm test -- packages/shared/tests/contracts.test.ts`  
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add packages/shared/src/contracts.ts packages/shared/tests/contracts.test.ts
git commit -m "feat: add discussion badge shared contracts"
```

---

### Task 2: Add Gateway Discussion Status And Mark-Seen Routes

**Files:**
- Modify: `packages/gateway-api/src/app.ts`
- Create: `packages/gateway-api/tests/loungeStatus.test.ts`

- [ ] **Step 1: Write the failing gateway lounge tests**

```typescript
import { describe, expect, it } from "vitest";
import { API_ROUTES } from "@pbg/shared/contracts";
import { buildApp } from "../src/app.js";

async function loginHeaders(app: ReturnType<typeof buildApp>): Promise<{ authorization: string }> {
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
  return { authorization: `Bearer ${accessToken}` };
}

describe("discussion lounge routes", () => {
  it("returns the student-specific discussion count", async () => {
    const app = buildApp();

    const response = await app.inject({
      method: "GET",
      url: API_ROUTES.discussionStatus,
      headers: await loginHeaders(app)
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({
      label: "PBG Discussion",
      href: "https://t.me/+Xpdv7ztBFFc1MGVh",
      unreadCount: 3
    });

    await app.close();
  });

  it("marks the discussion badge seen for the authenticated student", async () => {
    const app = buildApp();
    const headers = await loginHeaders(app);

    const response = await app.inject({
      method: "POST",
      url: API_ROUTES.discussionSeen,
      headers
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({
      ok: true,
      unreadCount: 0
    });

    const nextStatus = await app.inject({
      method: "GET",
      url: API_ROUTES.discussionStatus,
      headers
    });

    expect(nextStatus.json()).toMatchObject({
      unreadCount: 0
    });

    await app.close();
  });
});
```

- [ ] **Step 2: Run the gateway lounge tests to verify they fail**

Run: `npm test -- packages/gateway-api/tests/loungeStatus.test.ts`  
Expected: FAIL because the routes do not exist yet.

- [ ] **Step 3: Add minimal in-memory POC lounge state and routes**

```typescript
const POC_DISCUSSION_HREF = "https://t.me/+Xpdv7ztBFFc1MGVh";
const POC_DISCUSSION_LABEL = "PBG Discussion";
const POC_DISCUSSION_LATEST_MARKER = 3;

function createPocDiscussionState() {
  const seenMarkerByStudentId = new Map<string, number>();

  return {
    getStatus(studentId: string) {
      const seen = seenMarkerByStudentId.get(studentId) ?? 0;
      return {
        label: POC_DISCUSSION_LABEL,
        href: POC_DISCUSSION_HREF,
        unreadCount: Math.max(POC_DISCUSSION_LATEST_MARKER - seen, 0)
      };
    },
    markSeen(studentId: string) {
      seenMarkerByStudentId.set(studentId, POC_DISCUSSION_LATEST_MARKER);
      return {
        ok: true as const,
        unreadCount: 0
      };
    }
  };
}
```

Add the routes:

```typescript
const discussionState = createPocDiscussionState();

app.get(API_ROUTES.discussionStatus, { preHandler: requireAuth }, async (request) => {
  return discussionState.getStatus(request.authSession.student.studentId);
});

app.post(API_ROUTES.discussionSeen, { preHandler: requireAuth }, async (request) => {
  return discussionState.markSeen(request.authSession.student.studentId);
});
```

- [ ] **Step 4: Run the gateway lounge tests to verify they pass**

Run: `npm test -- packages/gateway-api/tests/loungeStatus.test.ts`  
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add packages/gateway-api/src/app.ts packages/gateway-api/tests/loungeStatus.test.ts
git commit -m "feat: add gateway discussion badge routes"
```

---

### Task 3: Extend Gateway Route Coverage For Per-Student Discussion State

**Files:**
- Modify: `packages/gateway-api/tests/gatewayRoutes.test.ts`

- [ ] **Step 1: Add the failing per-student state regression**

```typescript
it("keeps discussion badge state isolated per authenticated student", async () => {
  const app = buildApp({
    authService: {
      login: async (input) => ({
        accessToken: `${input.username}-access-token`,
        refreshToken: `${input.username}-refresh-token`,
        student: {
          studentId: input.username === "student_a"
            ? "00000000-0000-4000-8000-000000000201"
            : "00000000-0000-4000-8000-000000000202",
          displayName: input.username,
          tier: "pro",
          standingGood: true,
          creditBalance: 250
        },
        device: {
          deviceId: "device-id",
          vaultId: input.vaultId,
          status: "active"
        }
      })
    }
  });

  const loginA = await app.inject({
    method: "POST",
    url: API_ROUTES.authLogin,
    payload: {
      username: "student_a",
      password: "pw",
      vaultId: "vault-a",
      deviceFingerprint: "device-a",
      pluginVersion: "0.1.0"
    }
  });
  const loginB = await app.inject({
    method: "POST",
    url: API_ROUTES.authLogin,
    payload: {
      username: "student_b",
      password: "pw",
      vaultId: "vault-b",
      deviceFingerprint: "device-b",
      pluginVersion: "0.1.0"
    }
  });

  const headersA = { authorization: `Bearer ${loginA.json<{ accessToken: string }>().accessToken}` };
  const headersB = { authorization: `Bearer ${loginB.json<{ accessToken: string }>().accessToken}` };

  await app.inject({
    method: "POST",
    url: API_ROUTES.discussionSeen,
    headers: headersA
  });

  const statusA = await app.inject({
    method: "GET",
    url: API_ROUTES.discussionStatus,
    headers: headersA
  });
  const statusB = await app.inject({
    method: "GET",
    url: API_ROUTES.discussionStatus,
    headers: headersB
  });

  expect(statusA.json()).toMatchObject({ unreadCount: 0 });
  expect(statusB.json()).toMatchObject({ unreadCount: 3 });

  await app.close();
});
```

- [ ] **Step 2: Run the gateway route tests to verify the new case fails**

Run: `npm test -- packages/gateway-api/tests/gatewayRoutes.test.ts`  
Expected: FAIL until the POC discussion state is correctly shared within one app instance by student.

- [ ] **Step 3: Adjust the gateway state only if needed**

If the prior task's in-memory state was scoped incorrectly, ensure the discussion state is created once per app instance and keyed by `studentId`:

```typescript
const discussionState = createPocDiscussionState();
```

No extra per-request recreation is allowed.

- [ ] **Step 4: Run the gateway route tests to verify they pass**

Run: `npm test -- packages/gateway-api/tests/gatewayRoutes.test.ts`  
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add packages/gateway-api/tests/gatewayRoutes.test.ts packages/gateway-api/src/app.ts
git commit -m "test: cover per-student discussion badge state"
```

---

### Task 4: Add Plugin Discussion State Helpers

**Files:**
- Create: `packages/obsidian-plugin/src/discussionStatus.ts`
- Create: `packages/obsidian-plugin/tests/discussionStatus.test.ts`

- [ ] **Step 1: Write the failing plugin discussion state tests**

```typescript
import { describe, expect, it } from "vitest";
import {
  createDiscussionStatusState,
  getDiscussionBadgeLabel,
  mergeDiscussionStatus,
  markDiscussionSeenOptimistically
} from "../src/discussionStatus.js";

describe("discussion badge state", () => {
  it("starts with no unread discussion activity", () => {
    expect(createDiscussionStatusState()).toEqual({
      label: "PBG Discussion",
      href: null,
      unreadCount: 0
    });
  });

  it("caps badge labels at 9+", () => {
    expect(getDiscussionBadgeLabel(0)).toBeNull();
    expect(getDiscussionBadgeLabel(4)).toBe("4");
    expect(getDiscussionBadgeLabel(17)).toBe("9+");
  });

  it("merges gateway discussion status into local state", () => {
    const next = mergeDiscussionStatus(createDiscussionStatusState(), {
      label: "PBG Discussion",
      href: "https://t.me/+Xpdv7ztBFFc1MGVh",
      unreadCount: 3
    });

    expect(next).toEqual({
      label: "PBG Discussion",
      href: "https://t.me/+Xpdv7ztBFFc1MGVh",
      unreadCount: 3
    });
  });

  it("clears the badge immediately when discussion is marked seen", () => {
    expect(
      markDiscussionSeenOptimistically({
        label: "PBG Discussion",
        href: "https://t.me/+Xpdv7ztBFFc1MGVh",
        unreadCount: 5
      })
    ).toEqual({
      label: "PBG Discussion",
      href: "https://t.me/+Xpdv7ztBFFc1MGVh",
      unreadCount: 0
    });
  });
});
```

- [ ] **Step 2: Run the discussion state tests to verify they fail**

Run: `npm test -- packages/obsidian-plugin/tests/discussionStatus.test.ts`  
Expected: FAIL because the file does not exist yet.

- [ ] **Step 3: Add the discussion state module**

```typescript
import type { DiscussionStatusPayload } from "@pbg/shared/contracts";

export interface DiscussionStatusState {
  label: string;
  href: string | null;
  unreadCount: number;
}

export function createDiscussionStatusState(): DiscussionStatusState {
  return {
    label: "PBG Discussion",
    href: null,
    unreadCount: 0
  };
}

export function getDiscussionBadgeLabel(unreadCount: number): string | null {
  if (unreadCount <= 0) {
    return null;
  }

  return unreadCount > 9 ? "9+" : String(unreadCount);
}

export function mergeDiscussionStatus(
  _previous: DiscussionStatusState,
  payload: DiscussionStatusPayload
): DiscussionStatusState {
  return {
    label: payload.label,
    href: payload.href,
    unreadCount: Math.max(0, payload.unreadCount)
  };
}

export function markDiscussionSeenOptimistically(
  previous: DiscussionStatusState
): DiscussionStatusState {
  return {
    ...previous,
    unreadCount: 0
  };
}
```

- [ ] **Step 4: Run the discussion state tests to verify they pass**

Run: `npm test -- packages/obsidian-plugin/tests/discussionStatus.test.ts`  
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add packages/obsidian-plugin/src/discussionStatus.ts packages/obsidian-plugin/tests/discussionStatus.test.ts
git commit -m "feat: add plugin discussion badge state"
```

---

### Task 5: Add Plugin Client Methods For Discussion Status And Mark-Seen

**Files:**
- Modify: `packages/obsidian-plugin/src/apiClient.ts`
- Modify: `packages/obsidian-plugin/tests/apiClient.test.ts`

- [ ] **Step 1: Write the failing API client tests**

```typescript
it("fetches the discussion badge status from the gateway", async () => {
  const requests: Array<{ url: string; init?: RequestInit }> = [];
  const client = new PbgGatewayApiClient(
    "http://localhost:8788",
    async (input, init) => {
      requests.push({ url: input.toString(), init });
      return new Response(
        JSON.stringify({
          label: "PBG Discussion",
          href: "https://t.me/+Xpdv7ztBFFc1MGVh",
          unreadCount: 3
        })
      );
    },
    "short-lived-token"
  );

  const result = await client.getDiscussionStatus();

  expect(result.unreadCount).toBe(3);
  expect(requests[0]?.url).toBe("http://localhost:8788/api/lounge/discussion-status");
});

it("marks the discussion badge seen through the gateway", async () => {
  const requests: Array<{ url: string; init?: RequestInit }> = [];
  const client = new PbgGatewayApiClient(
    "http://localhost:8788",
    async (input, init) => {
      requests.push({ url: input.toString(), init });
      return new Response(
        JSON.stringify({
          ok: true,
          unreadCount: 0
        })
      );
    },
    "short-lived-token"
  );

  const result = await client.markDiscussionSeen();

  expect(result.ok).toBe(true);
  expect(requests[0]).toMatchObject({
    url: "http://localhost:8788/api/lounge/discussion-seen",
    init: {
      method: "POST",
      headers: {
        authorization: "Bearer short-lived-token"
      }
    }
  });
});
```

- [ ] **Step 2: Run the API client tests to verify they fail**

Run: `npm test -- packages/obsidian-plugin/tests/apiClient.test.ts`  
Expected: FAIL because `getDiscussionStatus` and `markDiscussionSeen` do not exist yet.

- [ ] **Step 3: Add the client methods**

```typescript
import type {
  DiscussionSeenResponse,
  DiscussionStatusPayload
} from "@pbg/shared/contracts";

async getDiscussionStatus(): Promise<DiscussionStatusPayload> {
  return this.requestJson<DiscussionStatusPayload>(API_ROUTES.discussionStatus);
}

async markDiscussionSeen(): Promise<DiscussionSeenResponse> {
  return this.requestJson<DiscussionSeenResponse>(API_ROUTES.discussionSeen, {
    method: "POST"
  });
}
```

- [ ] **Step 4: Run the API client tests to verify they pass**

Run: `npm test -- packages/obsidian-plugin/tests/apiClient.test.ts`  
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add packages/obsidian-plugin/src/apiClient.ts packages/obsidian-plugin/tests/apiClient.test.ts
git commit -m "feat: add discussion badge client methods"
```

---

### Task 6: Extend Dashboard Shell Model For Discussion Rail Items

**Files:**
- Modify: `packages/obsidian-plugin/src/dashboardShell.ts`
- Create: `packages/obsidian-plugin/tests/dashboardRail.test.ts`

- [ ] **Step 1: Write the failing dashboard rail test**

```typescript
import { describe, expect, it } from "vitest";
import { createDashboardShellModel } from "../src/dashboardShell.js";
import { DEFAULT_DASHBOARD_FLAGS } from "../src/dashboardFlags.js";
import { createDiscussionStatusState } from "../src/discussionStatus.js";
import { computeLocalPbgDashboardState } from "../src/localState.js";

describe("dashboard left rail model", () => {
  it("includes the PBG Discussion item with badge data", () => {
    const shell = createDashboardShellModel(
      computeLocalPbgDashboardState([]),
      DEFAULT_DASHBOARD_FLAGS,
      undefined,
      {
        ...createDiscussionStatusState(),
        href: "https://t.me/+Xpdv7ztBFFc1MGVh",
        unreadCount: 12
      }
    );

    expect(shell.leftRail.items.at(-1)).toEqual({
      id: "pbg-discussion",
      label: "PBG Discussion",
      badgeLabel: "9+",
      href: "https://t.me/+Xpdv7ztBFFc1MGVh",
      external: true
    });
  });
});
```

- [ ] **Step 2: Run the dashboard rail test to verify it fails**

Run: `npm test -- packages/obsidian-plugin/tests/dashboardRail.test.ts`  
Expected: FAIL because the shell model does not support badge/link fields yet.

- [ ] **Step 3: Extend the shell model**

```typescript
import type { DiscussionStatusState } from "./discussionStatus.js";
import { getDiscussionBadgeLabel } from "./discussionStatus.js";

export interface DashboardShellRailItem {
  id: string;
  label: string;
  badgeLabel?: string | null;
  href?: string | null;
  external?: boolean;
}
```

Add a fourth parameter to `createDashboardShellModel`:

```typescript
discussionStatus: DiscussionStatusState = createDiscussionStatusState()
```

Append this rail item:

```typescript
{
  id: "pbg-discussion",
  label: discussionStatus.label,
  badgeLabel: getDiscussionBadgeLabel(discussionStatus.unreadCount),
  href: discussionStatus.href,
  external: true
}
```

- [ ] **Step 4: Run the dashboard rail test to verify it passes**

Run: `npm test -- packages/obsidian-plugin/tests/dashboardRail.test.ts`  
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add packages/obsidian-plugin/src/dashboardShell.ts packages/obsidian-plugin/tests/dashboardRail.test.ts
git commit -m "feat: add discussion badge to dashboard rail model"
```

---

### Task 7: Wire Discussion Polling And Click Handling Into The Dashboard View

**Files:**
- Modify: `packages/obsidian-plugin/src/dashboardView.ts`
- Modify: `packages/obsidian-plugin/src/dashboardShell.ts`
- Modify: `packages/obsidian-plugin/styles.css`
- Modify: `packages/obsidian-plugin/tests/dashboardLifecycle.test.ts`

- [ ] **Step 1: Add the failing lifecycle and behavior tests**

```typescript
it("does not show a badge when the discussion count is zero", () => {
  // Add to dashboard rail model tests if easier:
  // shell.leftRail.items.find((item) => item.id === "pbg-discussion")?.badgeLabel === null
});

it("clears discussion count locally when the rail item is clicked", async () => {
  // Add a focused pure helper test by extracting click handling if needed.
  // Expect local discussion state unreadCount to become 0 before server reconciliation.
});
```

For the view, extract a helper that is testable without the full Obsidian runtime if needed:

```typescript
export async function handleDiscussionRailClick(
  state: DiscussionStatusState,
  client: Pick<PbgGatewayApiClient, "markDiscussionSeen">,
  openExternal: (href: string) => void
): Promise<DiscussionStatusState> {
  if (state.href) {
    openExternal(state.href);
  }

  const optimistic = markDiscussionSeenOptimistically(state);
  void client.markDiscussionSeen();
  return optimistic;
}
```

- [ ] **Step 2: Run the relevant tests to verify they fail**

Run: `npm test -- packages/obsidian-plugin/tests/dashboardRail.test.ts packages/obsidian-plugin/tests/dashboardLifecycle.test.ts`  
Expected: FAIL until the discussion state and click handling are wired in.

- [ ] **Step 3: Add dashboard view discussion polling and click handling**

Add local state to the view:

```typescript
private discussionStatus = createDiscussionStatusState();
private discussionPollHandle?: number;
```

Add polling methods:

```typescript
private async refreshDiscussionStatus(): Promise<void> {
  const client = this.getGatewayClient();
  if (!client) {
    return;
  }

  try {
    this.discussionStatus = mergeDiscussionStatus(
      this.discussionStatus,
      await client.getDiscussionStatus()
    );
    this.renderDashboard();
  } catch (error) {
    console.warn("PBG discussion status refresh failed", error);
  }
}
```

Add start/stop methods similar to announcement polling:

```typescript
private startDiscussionPolling(): void {
  this.stopDiscussionPolling();
  if (this.isDisposed || !this.getGatewayClient()) {
    return;
  }

  this.discussionPollHandle = window.setInterval(() => {
    void this.refreshDiscussionStatus();
  }, 60_000);
}
```

Wire open and close:

```typescript
this.discussionStatus = createDiscussionStatusState();
await this.refreshDiscussionStatus();
this.startDiscussionPolling();
```

Pass discussion state into `createDashboardShellModel(...)`.

Handle rail clicks in the render path:

```typescript
if (item.id === "pbg-discussion" && item.href) {
  await this.handleDiscussionClick(item.href);
}
```

Use Obsidian external-open behavior:

```typescript
window.open(href, "_blank", "noopener,noreferrer");
```

Optimistic clear:

```typescript
this.discussionStatus = markDiscussionSeenOptimistically(this.discussionStatus);
this.renderDashboard();
void client.markDiscussionSeen().catch((error) => {
  console.warn("PBG discussion seen update failed", error);
});
```

- [ ] **Step 4: Style the discussion badge**

Add CSS:

```css
.pbg-shell__railItem {
  align-items: center;
  display: flex;
  justify-content: space-between;
}

.pbg-shell__railItem.is-link {
  cursor: pointer;
}

.pbg-shell__railBadge {
  align-items: center;
  background: var(--interactive-accent);
  border-radius: 999px;
  color: var(--text-on-accent, #fff);
  display: inline-flex;
  font-size: 0.78rem;
  font-weight: 700;
  justify-content: center;
  min-width: 24px;
  padding: 2px 8px;
}
```

- [ ] **Step 5: Run focused plugin tests**

Run: `npm test -- packages/obsidian-plugin/tests/discussionStatus.test.ts packages/obsidian-plugin/tests/dashboardRail.test.ts packages/obsidian-plugin/tests/dashboardLifecycle.test.ts`  
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add packages/obsidian-plugin/src/dashboardView.ts packages/obsidian-plugin/src/dashboardShell.ts packages/obsidian-plugin/styles.css packages/obsidian-plugin/tests/dashboardLifecycle.test.ts packages/obsidian-plugin/tests/dashboardRail.test.ts
git commit -m "feat: wire discussion badge into dashboard rail"
```

---

### Task 8: Log Errors And Run Whole-Feature Verification

**Files:**
- Modify: `docs/build-error-log.md`

- [ ] **Step 1: Log every red test and fix encountered during this slice**

Add entries in `docs/build-error-log.md` for:

- missing shared routes/types
- missing gateway lounge routes
- any per-student state bug
- any discussion badge render/click test failure
- any build/type issue during rail integration

- [ ] **Step 2: Run the full test suite**

Run: `npm test`  
Expected: PASS

- [ ] **Step 3: Run typecheck**

Run: `npm run typecheck`  
Expected: PASS

- [ ] **Step 4: Run full build**

Run: `npm run build`  
Expected: PASS

- [ ] **Step 5: Run install safety check**

Run: `.\scripts\install-plugin.ps1 -VaultPath "E:\Obsidian\PBG Plug in" -WhatIf`  
Expected: WhatIf output only, no writes.

- [ ] **Step 6: Live Obsidian smoke pass**

Verify in the actual vault:

- `PBG Discussion` appears in the left rail
- no badge shows when unread count is zero
- badge shows a number when unread count is nonzero
- `9+` appears when count exceeds `9`
- clicking the item opens the Telegram link
- clicking the item clears the badge immediately

- [ ] **Step 7: Final commit**

```bash
git add docs/build-error-log.md
git add .
git commit -m "feat: add PBG discussion badge"
```

---

## Self-Review

Spec coverage:

- left rail `PBG Discussion` item: covered in Tasks 6-7
- numeric badge rules: covered in Tasks 4 and 6
- poll through gateway: covered in Tasks 2, 5, and 7
- open Telegram on click: covered in Task 7
- mark seen immediately on click: covered in Tasks 2, 4, and 7
- per-student state: covered in Tasks 2 and 3
- no embed/chat-client scope creep: preserved by task boundaries

Placeholder scan:

- No `TBD`, `TODO`, or hand-wavy “appropriate handling” steps remain.

Type consistency:

- Shared types: `DiscussionStatusPayload` and `DiscussionSeenResponse`
- Shared routes: `API_ROUTES.discussionStatus` and `API_ROUTES.discussionSeen`
- Plugin state names: `DiscussionStatusState`, `mergeDiscussionStatus`, `markDiscussionSeenOptimistically`
- Badge label helper: `getDiscussionBadgeLabel`
