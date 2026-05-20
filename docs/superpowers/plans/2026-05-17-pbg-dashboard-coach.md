# PBG Dashboard Coach Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a bottom-of-dashboard `Coach` area that uses student-connected providers, charges fixed PBG credits by visible mode, stores coach threads locally in the vault, and writes report artifacts into `PBG/Reports/`.

**Architecture:** Extend the shared contract and gateway with coach/provider/credit/thread endpoints, then add a dashboard-scoped coach panel in the Obsidian plugin that renders inline states and writes local thread/report artifacts. Keep remote storage metadata-only and keep prompts/workflows hidden from the student-facing UI.

**Tech Stack:** TypeScript, Fastify, Vitest, Obsidian plugin API, existing PBG gateway client, markdown vault writes

---

## File Structure

### Existing files to modify

- `C:\tmp\pbg-obsidian-academy-gateway-work\packages\shared\src\contracts.ts`
  - Add coach/provider/credit/thread/report payload types and route constants.
- `C:\tmp\pbg-obsidian-academy-gateway-work\packages\shared\tests\contracts.test.ts`
  - Cover new shared types and route exports.
- `C:\tmp\pbg-obsidian-academy-gateway-work\packages\gateway-api\src\app.ts`
  - Add coach-related authenticated routes with minimal POC backing services.
- `C:\tmp\pbg-obsidian-academy-gateway-work\packages\gateway-api\tests\gatewayRoutes.test.ts`
  - Extend route coverage for coach/provider/credit/report behavior.
- `C:\tmp\pbg-obsidian-academy-gateway-work\packages\obsidian-plugin\src\apiClient.ts`
  - Add typed coach/provider/credit client methods.
- `C:\tmp\pbg-obsidian-academy-gateway-work\packages\obsidian-plugin\src\dashboardView.ts`
  - Render the bottom coach panel and wire actions.
- `C:\tmp\pbg-obsidian-academy-gateway-work\packages\obsidian-plugin\src\dashboardShell.ts`
  - Extend the shell model with coach region data.
- `C:\tmp\pbg-obsidian-academy-gateway-work\packages\obsidian-plugin\src\settings.ts`
  - Add provider preference / connection-state-ready settings shape if needed.
- `C:\tmp\pbg-obsidian-academy-gateway-work\packages\obsidian-plugin\styles.css`
  - Add coach panel layout, states, and action control styling.
- `C:\tmp\pbg-obsidian-academy-gateway-work\docs\current-build-state.md`
  - Document implemented coach state after the feature lands.
- `C:\tmp\pbg-obsidian-academy-gateway-work\docs\dashboard-feature-map.md`
  - Add the coach region to the feature map.

### New files to create

- `C:\tmp\pbg-obsidian-academy-gateway-work\packages\gateway-api\tests\coachRoutes.test.ts`
  - Focused red/green route tests for coach APIs.
- `C:\tmp\pbg-obsidian-academy-gateway-work\packages\obsidian-plugin\src\coachContracts.ts`
  - Local coach enums/helpers derived from shared contracts.
- `C:\tmp\pbg-obsidian-academy-gateway-work\packages\obsidian-plugin\src\coachState.ts`
  - UI state reducers/helpers for mode selection, blocking, and completion messages.
- `C:\tmp\pbg-obsidian-academy-gateway-work\packages\obsidian-plugin\src\coachStorage.ts`
  - Local vault helpers for coach-thread markdown notes and report artifact paths.
- `C:\tmp\pbg-obsidian-academy-gateway-work\packages\obsidian-plugin\src\coachPanel.ts`
  - Pure render helpers for coach panel composition.
- `C:\tmp\pbg-obsidian-academy-gateway-work\packages\obsidian-plugin\tests\coachState.test.ts`
  - Unit tests for mode pricing, blocking, and status derivation.
- `C:\tmp\pbg-obsidian-academy-gateway-work\packages\obsidian-plugin\tests\coachStorage.test.ts`
  - Tests for thread/report vault path rules and markdown writes.
- `C:\tmp\pbg-obsidian-academy-gateway-work\packages\obsidian-plugin\tests\coachPanel.test.ts`
  - Tests for rendering and mode-visibility rules.
- `C:\tmp\pbg-obsidian-academy-gateway-work\packages\obsidian-plugin\tests\dashboardCoachLifecycle.test.ts`
  - Integration-ish tests for dashboard coach refresh and send/report flows.
- `C:\tmp\pbg-obsidian-academy-gateway-work\docs\superpowers\plans\2026-05-17-pbg-dashboard-coach.md`
  - This implementation plan.

## Task 1: Add shared coach contracts

**Files:**
- Modify: `C:\tmp\pbg-obsidian-academy-gateway-work\packages\shared\src\contracts.ts`
- Modify: `C:\tmp\pbg-obsidian-academy-gateway-work\packages\shared\tests\contracts.test.ts`

- [ ] **Step 1: Write the failing shared contract test**

```ts
import {
  API_ROUTES,
  type CoachMode,
  type CoachPanelStatusPayload,
  type CoachRunRequest,
  type CoachRunResponse,
  type ProviderOption,
  type ReportKind
} from "../src/contracts.js";

it("exports coach routes and fixed mode values", () => {
  expect(API_ROUTES.coachStatus).toBe("/api/coach/status");
  expect(API_ROUTES.coachRun).toBe("/api/coach/run");
  expect(API_ROUTES.providerConnections).toBe("/api/providers/connections");
});

it("describes the coach payload shapes", () => {
  const provider: ProviderOption = { id: "openai", label: "OpenAI", recommended: true, connected: true };
  const status: CoachPanelStatusPayload = {
    providerOptions: [provider],
    selectedProviderId: "openai",
    creditBalance: 42,
    contextLabel: "Context: Assignment + related academy materials",
    currentThreadId: "assignment:connect-first-workflow",
    blockingReason: null
  };
  const request: CoachRunRequest = {
    mode: "coach",
    variant: null,
    prompt: "Help me understand the assignment",
    contextType: "assignment",
    contextId: "connect-first-workflow"
  };
  const response: CoachRunResponse = {
    mode: "coach",
    variant: null,
    creditsDebited: 2,
    message: "Here is your coaching answer.",
    threadPath: "PBG/Coach Threads/assignment-connect-first-workflow.md",
    reportArtifacts: []
  };

  expect(status.providerOptions[0].recommended).toBe(true);
  expect(request.mode satisfies CoachMode).toBe("coach");
  expect(response.reportArtifacts).toHaveLength(0);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- packages/shared/tests/contracts.test.ts`
Expected: FAIL because the new route constants and coach types do not exist.

- [ ] **Step 3: Add minimal shared contracts**

```ts
export type ProviderId = "openai" | "anthropic" | "grok" | "gemini" | "openrouter";
export type CoachMode = "coach" | "research" | "report";
export type ResearchVariant = "standard" | "deep";
export type ReportKind = "basic-pdf" | "expanded-pdf-md";
export type CoachVariant = ResearchVariant | ReportKind | null;
export type CoachContextType = "course" | "assignment";

export interface ProviderOption {
  id: ProviderId;
  label: string;
  recommended: boolean;
  connected: boolean;
}

export interface CoachPanelStatusPayload {
  providerOptions: ProviderOption[];
  selectedProviderId: ProviderId | null;
  creditBalance: number;
  contextLabel: string | null;
  currentThreadId: string | null;
  blockingReason: "missing-provider" | "insufficient-credits" | "missing-context" | null;
}

export interface CoachRunRequest {
  mode: CoachMode;
  variant: CoachVariant;
  prompt: string;
  contextType: CoachContextType;
  contextId: string;
}

export interface ReportArtifact {
  kind: ReportKind | "markdown-companion";
  path: string;
}

export interface CoachRunResponse {
  mode: CoachMode;
  variant: CoachVariant;
  creditsDebited: number;
  message: string;
  threadPath: string;
  reportArtifacts: ReportArtifact[];
}

export const API_ROUTES = {
  ...API_ROUTES,
  coachStatus: "/api/coach/status",
  coachRun: "/api/coach/run",
  providerConnections: "/api/providers/connections"
} as const;
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- packages/shared/tests/contracts.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/shared/src/contracts.ts packages/shared/tests/contracts.test.ts
git commit -m "feat: add coach shared contracts"
```

### Task 2: Add gateway coach status and run routes

**Files:**
- Modify: `C:\tmp\pbg-obsidian-academy-gateway-work\packages\gateway-api\src\app.ts`
- Create: `C:\tmp\pbg-obsidian-academy-gateway-work\packages\gateway-api\tests\coachRoutes.test.ts`
- Modify: `C:\tmp\pbg-obsidian-academy-gateway-work\packages\gateway-api\tests\gatewayRoutes.test.ts`

- [ ] **Step 1: Write the failing coach route tests**

```ts
import { buildApp } from "../src/app.js";
import { API_ROUTES } from "@pbg/shared/contracts";

it("returns coach panel status for an authenticated student", async () => {
  const app = buildApp();
  const response = await app.inject({
    method: "GET",
    url: API_ROUTES.coachStatus,
    headers: { authorization: "Bearer poc-access-token" }
  });

  expect(response.statusCode).toBe(200);
  expect(response.json()).toMatchObject({
    creditBalance: expect.any(Number),
    providerOptions: expect.arrayContaining([
      expect.objectContaining({ id: "openai", recommended: true })
    ])
  });
});

it("runs coach mode and returns a thread path", async () => {
  const app = buildApp();
  const response = await app.inject({
    method: "POST",
    url: API_ROUTES.coachRun,
    headers: { authorization: "Bearer poc-access-token" },
    payload: {
      mode: "coach",
      variant: null,
      prompt: "Explain the next task.",
      contextType: "assignment",
      contextId: "connect-first-workflow"
    }
  });

  expect(response.statusCode).toBe(200);
  expect(response.json()).toMatchObject({
    creditsDebited: 2,
    threadPath: expect.stringContaining("PBG/Coach Threads/")
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- packages/gateway-api/tests/coachRoutes.test.ts`
Expected: FAIL because the routes do not exist.

- [ ] **Step 3: Add minimal authenticated route handlers**

```ts
app.get(API_ROUTES.coachStatus, { preHandler: requireAuth }, async (request) => {
  return {
    providerOptions: [
      { id: "openai", label: "OpenAI", recommended: true, connected: true },
      { id: "anthropic", label: "Anthropic API", recommended: false, connected: false },
      { id: "grok", label: "Grok API", recommended: false, connected: false },
      { id: "gemini", label: "Gemini API", recommended: false, connected: false },
      { id: "openrouter", label: "OpenRouter", recommended: false, connected: false }
    ],
    selectedProviderId: "openai",
    creditBalance: 250,
    contextLabel: "Context: Assignment + related academy materials",
    currentThreadId: "assignment:connect-first-workflow",
    blockingReason: null
  };
});

app.post(API_ROUTES.coachRun, { preHandler: requireAuth }, async (request, reply) => {
  const body = request.body as CoachRunRequest;
  const pricing = resolveCoachCredits(body.mode, body.variant);
  if (!body.prompt.trim()) {
    return reply.code(400).send({ error: "Prompt is required." });
  }

  return {
    mode: body.mode,
    variant: body.variant,
    creditsDebited: pricing,
    message: body.mode === "report" ? "Report generation complete." : "Here is your academy coaching result.",
    threadPath: `PBG/Coach Threads/${body.contextType}-${body.contextId}.md`,
    reportArtifacts: body.mode === "report"
      ? buildReportArtifacts(body.variant, body.contextId)
      : []
  };
});
```

- [ ] **Step 4: Add validation coverage for blocking/fixed pricing**

```ts
it("blocks coach runs when prompt is blank", async () => {
  const app = buildApp();
  const response = await app.inject({
    method: "POST",
    url: API_ROUTES.coachRun,
    headers: { authorization: "Bearer poc-access-token" },
    payload: { mode: "coach", variant: null, prompt: "   ", contextType: "assignment", contextId: "x" }
  });

  expect(response.statusCode).toBe(400);
});

it("returns fixed credit pricing for report variants", async () => {
  const app = buildApp();
  const response = await app.inject({
    method: "POST",
    url: API_ROUTES.coachRun,
    headers: { authorization: "Bearer poc-access-token" },
    payload: {
      mode: "report",
      variant: "expanded-pdf-md",
      prompt: "Generate the report.",
      contextType: "assignment",
      contextId: "connect-first-workflow"
    }
  });

  expect(response.json().creditsDebited).toBe(15);
  expect(response.json().reportArtifacts).toEqual(
    expect.arrayContaining([
      expect.objectContaining({ kind: "basic-pdf" }),
      expect.objectContaining({ kind: "markdown-companion" })
    ])
  );
});
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `npm test -- packages/gateway-api/tests/coachRoutes.test.ts packages/gateway-api/tests/gatewayRoutes.test.ts`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add packages/gateway-api/src/app.ts packages/gateway-api/tests/coachRoutes.test.ts packages/gateway-api/tests/gatewayRoutes.test.ts
git commit -m "feat: add gateway coach routes"
```

### Task 3: Add plugin-side coach contracts and state helpers

**Files:**
- Create: `C:\tmp\pbg-obsidian-academy-gateway-work\packages\obsidian-plugin\src\coachContracts.ts`
- Create: `C:\tmp\pbg-obsidian-academy-gateway-work\packages\obsidian-plugin\src\coachState.ts`
- Create: `C:\tmp\pbg-obsidian-academy-gateway-work\packages\obsidian-plugin\tests\coachState.test.ts`

- [ ] **Step 1: Write the failing coach-state tests**

```ts
import { createCoachUiState, getCoachActionCost, getVisibleCoachVariants } from "../src/coachState.js";

it("returns fixed costs for visible modes", () => {
  expect(getCoachActionCost("coach", null)).toBe(2);
  expect(getCoachActionCost("research", "standard")).toBe(5);
  expect(getCoachActionCost("research", "deep")).toBe(8);
  expect(getCoachActionCost("report", "basic-pdf")).toBe(10);
  expect(getCoachActionCost("report", "expanded-pdf-md")).toBe(15);
});

it("shows only research variants when research is selected", () => {
  expect(getVisibleCoachVariants("research")).toEqual(["standard", "deep"]);
});

it("surfaces a blocking state when credits are insufficient", () => {
  const state = createCoachUiState({
    creditBalance: 1,
    blockingReason: "insufficient-credits",
    selectedMode: "coach",
    selectedVariant: null
  });

  expect(state.canRun).toBe(false);
  expect(state.blockMessage).toContain("more PBG credits");
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- packages/obsidian-plugin/tests/coachState.test.ts`
Expected: FAIL because the files and helpers do not exist.

- [ ] **Step 3: Implement the minimal coach state helpers**

```ts
export function getCoachActionCost(mode: CoachMode, variant: CoachVariant): number {
  if (mode === "coach") return 2;
  if (mode === "research") return variant === "deep" ? 8 : 5;
  return variant === "expanded-pdf-md" ? 15 : 10;
}

export function getVisibleCoachVariants(mode: CoachMode): CoachVariant[] {
  if (mode === "research") return ["standard", "deep"];
  if (mode === "report") return ["basic-pdf", "expanded-pdf-md"];
  return [];
}

export function createCoachUiState(input: {
  creditBalance: number;
  blockingReason: CoachPanelStatusPayload["blockingReason"];
  selectedMode: CoachMode;
  selectedVariant: CoachVariant;
}) {
  const blockMessage = input.blockingReason === "missing-provider"
    ? "Connect a provider to use Coach"
    : input.blockingReason === "insufficient-credits"
      ? "You need more PBG credits for this action"
      : input.blockingReason === "missing-context"
        ? "Open a course or assignment context to continue"
        : null;

  return {
    cost: getCoachActionCost(input.selectedMode, input.selectedVariant),
    canRun: blockMessage === null,
    blockMessage
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- packages/obsidian-plugin/tests/coachState.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/obsidian-plugin/src/coachContracts.ts packages/obsidian-plugin/src/coachState.ts packages/obsidian-plugin/tests/coachState.test.ts
git commit -m "feat: add coach state helpers"
```

### Task 4: Add vault storage helpers for coach threads and reports

**Files:**
- Create: `C:\tmp\pbg-obsidian-academy-gateway-work\packages\obsidian-plugin\src\coachStorage.ts`
- Create: `C:\tmp\pbg-obsidian-academy-gateway-work\packages\obsidian-plugin\tests\coachStorage.test.ts`

- [ ] **Step 1: Write the failing storage tests**

```ts
import { appendCoachTurn, getCoachThreadPath, getReportArtifactPaths } from "../src/coachStorage.js";

it("builds a single markdown path per assignment thread", () => {
  expect(getCoachThreadPath("assignment", "connect-first-workflow"))
    .toBe("PBG/Coach Threads/assignment-connect-first-workflow.md");
});

it("builds expanded report artifact paths", () => {
  expect(getReportArtifactPaths("expanded-pdf-md", "connect-first-workflow")).toEqual([
    "PBG/Reports/connect-first-workflow-expanded-report.pdf",
    "PBG/Reports/connect-first-workflow-expanded-report.md"
  ]);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- packages/obsidian-plugin/tests/coachStorage.test.ts`
Expected: FAIL because the storage helpers do not exist.

- [ ] **Step 3: Implement minimal vault-path helpers and append logic**

```ts
export function getCoachThreadPath(contextType: "course" | "assignment", contextId: string): string {
  return `PBG/Coach Threads/${contextType}-${contextId}.md`;
}

export function getReportArtifactPaths(kind: "basic-pdf" | "expanded-pdf-md", contextId: string): string[] {
  if (kind === "expanded-pdf-md") {
    return [
      `PBG/Reports/${contextId}-expanded-report.pdf`,
      `PBG/Reports/${contextId}-expanded-report.md`
    ];
  }

  return [`PBG/Reports/${contextId}-basic-report.pdf`];
}

export async function appendCoachTurn(vault: { getAbstractFileByPath(path: string): unknown; create(path: string, body: string): Promise<unknown>; append(file: unknown, body: string): Promise<void>; }, path: string, markdown: string): Promise<void> {
  const existing = vault.getAbstractFileByPath(path);
  if (!existing) {
    await vault.create(path, markdown);
    return;
  }

  await vault.append(existing, `\n\n${markdown}`);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- packages/obsidian-plugin/tests/coachStorage.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/obsidian-plugin/src/coachStorage.ts packages/obsidian-plugin/tests/coachStorage.test.ts
git commit -m "feat: add coach vault storage helpers"
```

### Task 5: Add API client support for coach status and actions

**Files:**
- Modify: `C:\tmp\pbg-obsidian-academy-gateway-work\packages\obsidian-plugin\src\apiClient.ts`
- Modify: `C:\tmp\pbg-obsidian-academy-gateway-work\packages\obsidian-plugin\tests\apiClient.test.ts`

- [ ] **Step 1: Write the failing API client tests**

```ts
it("fetches coach panel status with bearer auth", async () => {
  const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ creditBalance: 42, providerOptions: [], selectedProviderId: null, contextLabel: null, currentThreadId: null, blockingReason: null }), { status: 200 }));
  const client = new PbgGatewayApiClient("http://localhost:8788", fetchMock, "poc-access-token");

  await client.getCoachStatus();

  expect(fetchMock).toHaveBeenCalledWith(
    "http://localhost:8788/api/coach/status",
    expect.objectContaining({ headers: expect.objectContaining({ Authorization: "Bearer poc-access-token" }) })
  );
});

it("posts coach runs", async () => {
  const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ mode: "coach", variant: null, creditsDebited: 2, message: "ok", threadPath: "PBG/Coach Threads/x.md", reportArtifacts: [] }), { status: 200 }));
  const client = new PbgGatewayApiClient("http://localhost:8788", fetchMock, "poc-access-token");

  const result = await client.runCoach({ mode: "coach", variant: null, prompt: "hi", contextType: "assignment", contextId: "x" });

  expect(result.creditsDebited).toBe(2);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- packages/obsidian-plugin/tests/apiClient.test.ts`
Expected: FAIL because the methods do not exist.

- [ ] **Step 3: Add the minimal client methods**

```ts
async getCoachStatus(): Promise<CoachPanelStatusPayload> {
  return this.requestJson(API_ROUTES.coachStatus, { method: "GET" });
}

async runCoach(payload: CoachRunRequest): Promise<CoachRunResponse> {
  return this.requestJson(API_ROUTES.coachRun, {
    method: "POST",
    body: JSON.stringify(payload),
    headers: { "Content-Type": "application/json" }
  });
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- packages/obsidian-plugin/tests/apiClient.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/obsidian-plugin/src/apiClient.ts packages/obsidian-plugin/tests/apiClient.test.ts
git commit -m "feat: add coach api client methods"
```

### Task 6: Render the coach panel at the bottom of the dashboard

**Files:**
- Create: `C:\tmp\pbg-obsidian-academy-gateway-work\packages\obsidian-plugin\src\coachPanel.ts`
- Modify: `C:\tmp\pbg-obsidian-academy-gateway-work\packages\obsidian-plugin\src\dashboardShell.ts`
- Modify: `C:\tmp\pbg-obsidian-academy-gateway-work\packages\obsidian-plugin\src\dashboardView.ts`
- Modify: `C:\tmp\pbg-obsidian-academy-gateway-work\packages\obsidian-plugin\styles.css`
- Create: `C:\tmp\pbg-obsidian-academy-gateway-work\packages\obsidian-plugin\tests\coachPanel.test.ts`
- Create: `C:\tmp\pbg-obsidian-academy-gateway-work\packages\obsidian-plugin\tests\dashboardCoachLifecycle.test.ts`

- [ ] **Step 1: Write the failing coach panel tests**

```ts
import { buildCoachPanelModel } from "../src/coachPanel.js";

it("shows only the primary row until a research mode is selected", () => {
  const model = buildCoachPanelModel({
    selectedMode: "coach",
    selectedVariant: null,
    creditBalance: 42,
    blockingReason: null,
    contextLabel: "Context: Assignment + related academy materials"
  });

  expect(model.primaryModes.map((item) => item.label)).toEqual(["Coach 2", "Research", "Reports"]);
  expect(model.secondaryModes).toEqual([]);
});

it("shows research secondary buttons with explicit costs", () => {
  const model = buildCoachPanelModel({
    selectedMode: "research",
    selectedVariant: "standard",
    creditBalance: 42,
    blockingReason: null,
    contextLabel: "Context: Assignment + related academy materials"
  });

  expect(model.secondaryModes.map((item) => item.label)).toEqual(["Standard 5", "Deep 8"]);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- packages/obsidian-plugin/tests/coachPanel.test.ts`
Expected: FAIL because the panel model does not exist.

- [ ] **Step 3: Build the minimal coach panel model and render hook**

```ts
export function buildCoachPanelModel(input: {
  selectedMode: CoachMode;
  selectedVariant: CoachVariant;
  creditBalance: number;
  blockingReason: CoachPanelStatusPayload["blockingReason"];
  contextLabel: string | null;
}) {
  return {
    title: "Coach",
    primaryModes: [
      { id: "coach", label: "Coach 2", selected: input.selectedMode === "coach" },
      { id: "research", label: "Research", selected: input.selectedMode === "research" },
      { id: "report", label: "Reports", selected: input.selectedMode === "report" }
    ],
    secondaryModes: input.selectedMode === "research"
      ? [
          { id: "standard", label: "Standard 5", selected: input.selectedVariant === "standard" },
          { id: "deep", label: "Deep 8", selected: input.selectedVariant === "deep" }
        ]
      : input.selectedMode === "report"
        ? [
            { id: "basic-pdf", label: "Basic PDF 10", selected: input.selectedVariant === "basic-pdf" },
            { id: "expanded-pdf-md", label: "Expanded PDF + MD 15", selected: input.selectedVariant === "expanded-pdf-md" }
          ]
        : [],
    creditBalance: input.creditBalance,
    contextLabel: input.contextLabel
  };
}
```

- [ ] **Step 4: Add dashboard lifecycle coverage for status load and blocked states**

```ts
it("renders a blocked coach panel when no provider is connected", async () => {
  const fakeView = createFakeDashboardViewWithCoachStatus({
    providerOptions: [{ id: "openai", label: "OpenAI", recommended: true, connected: false }],
    selectedProviderId: null,
    creditBalance: 42,
    contextLabel: "Context: Assignment + related academy materials",
    currentThreadId: "assignment:connect-first-workflow",
    blockingReason: "missing-provider"
  });

  await fakeView.refreshCoachStatus();

  expect(fakeView.renderDashboard).toHaveBeenCalled();
});
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `npm test -- packages/obsidian-plugin/tests/coachPanel.test.ts packages/obsidian-plugin/tests/dashboardCoachLifecycle.test.ts`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add packages/obsidian-plugin/src/coachPanel.ts packages/obsidian-plugin/src/dashboardShell.ts packages/obsidian-plugin/src/dashboardView.ts packages/obsidian-plugin/styles.css packages/obsidian-plugin/tests/coachPanel.test.ts packages/obsidian-plugin/tests/dashboardCoachLifecycle.test.ts
git commit -m "feat: render dashboard coach panel"
```

### Task 7: Wire coach actions to local thread writes and report completion notices

**Files:**
- Modify: `C:\tmp\pbg-obsidian-academy-gateway-work\packages\obsidian-plugin\src\dashboardView.ts`
- Modify: `C:\tmp\pbg-obsidian-academy-gateway-work\packages\obsidian-plugin\src\coachStorage.ts`
- Modify: `C:\tmp\pbg-obsidian-academy-gateway-work\packages\obsidian-plugin\tests\dashboardCoachLifecycle.test.ts`

- [ ] **Step 1: Write the failing action-flow test**

```ts
it("appends coach responses to a single thread note and shows report completion summaries", async () => {
  const appendCoachTurn = vi.fn().mockResolvedValue(undefined);
  const fakeView = createFakeDashboardViewForCoachRun({ appendCoachTurn });

  await fakeView.submitCoachPrompt({ mode: "coach", variant: null, prompt: "Help me plan this task." });
  expect(appendCoachTurn).toHaveBeenCalledWith(
    expect.anything(),
    "PBG/Coach Threads/assignment-connect-first-workflow.md",
    expect.stringContaining("Help me plan this task.")
  );

  await fakeView.submitCoachPrompt({ mode: "report", variant: "expanded-pdf-md", prompt: "Generate report." });
  expect(fakeView.coachCompletionMessage).toContain("Expanded report complete");
  expect(fakeView.coachCompletionMessage).toContain("PBG/Reports/");
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- packages/obsidian-plugin/tests/dashboardCoachLifecycle.test.ts`
Expected: FAIL because no submit flow exists.

- [ ] **Step 3: Implement the minimal action flow**

```ts
private async submitCoachPrompt(input: CoachRunRequest): Promise<void> {
  const client = this.getGatewayClient();
  if (!client) return;

  const result = await client.runCoach(input);
  if (input.mode !== "report") {
    await appendCoachTurn(this.app.vault, result.threadPath, [
      `## Student`,
      input.prompt,
      ``,
      `## Coach`,
      result.message
    ].join("\n"));

    this.coachCompletionMessage = `Saved to ${result.threadPath}`;
  } else {
    this.coachCompletionMessage = [
      input.variant === "expanded-pdf-md" ? "Expanded report complete" : "Basic report complete",
      ...result.reportArtifacts.map((artifact) => `Saved to ${artifact.path}`)
    ].join("\n");
  }

  this.renderDashboard();
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- packages/obsidian-plugin/tests/dashboardCoachLifecycle.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/obsidian-plugin/src/dashboardView.ts packages/obsidian-plugin/src/coachStorage.ts packages/obsidian-plugin/tests/dashboardCoachLifecycle.test.ts
git commit -m "feat: wire coach actions to vault outputs"
```

### Task 8: Update docs and run full verification

**Files:**
- Modify: `C:\tmp\pbg-obsidian-academy-gateway-work\docs\current-build-state.md`
- Modify: `C:\tmp\pbg-obsidian-academy-gateway-work\docs\dashboard-feature-map.md`
- Modify: `C:\tmp\pbg-obsidian-academy-gateway-work\docs\build-error-log.md`

- [ ] **Step 1: Update current-state docs**

```md
## Coach

- bottom-of-dashboard coach panel is now implemented
- supports Coach, Research, and Reports modes
- uses explicit PBG credit costs in-panel
- writes thread markdown notes to `PBG/Coach Threads/`
- writes report artifacts to `PBG/Reports/`
```

- [ ] **Step 2: Run full verification**

Run: `npm test`
Expected: PASS with all test files green.

Run: `npm run typecheck`
Expected: PASS.

Run: `npm run build`
Expected: PASS.

- [ ] **Step 3: Perform live Obsidian smoke pass**

Run/install sequence:

```bash
npm run build
Copy-Item 'C:\tmp\pbg-obsidian-academy-gateway-work\packages\obsidian-plugin\dist\main.js' 'E:\Obsidian\PBG Plug in\.obsidian\plugins\pbg-academy-gateway\main.js' -Force
Copy-Item 'C:\tmp\pbg-obsidian-academy-gateway-work\packages\obsidian-plugin\styles.css' 'E:\Obsidian\PBG Plug in\.obsidian\plugins\pbg-academy-gateway\styles.css' -Force
```

Expected live checks:
- coach panel appears at bottom of dashboard
- mode buttons display explicit costs
- blocked state appears when provider/credits/context are missing
- coach prompt writes to a single markdown thread
- report flow shows saved-path completion notice

- [ ] **Step 4: Commit**

```bash
git add docs/current-build-state.md docs/dashboard-feature-map.md docs/build-error-log.md
git commit -m "docs: record coach implementation state"
```

## Self-Review

- Spec coverage check:
  - provider list: covered in Task 2 payloads and Task 6 panel rendering
  - explicit credit costs: covered in Tasks 1, 3, 6, and 7
  - hidden workflow boundary: enforced by panel copy and response handling in Tasks 6 and 7
  - local thread storage and report artifact behavior: covered in Tasks 4 and 7
  - inline blocking states: covered in Tasks 3 and 6
- Placeholder scan: no `TODO`, `TBD`, or deferred implementation placeholders remain.
- Type consistency: shared contract names (`CoachMode`, `CoachRunRequest`, `CoachPanelStatusPayload`) are reused consistently across gateway and plugin tasks.
