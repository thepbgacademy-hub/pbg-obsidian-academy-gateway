# PBG Obsidian Academy Gateway Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a structurally sound proof-of-concept for the PBG Academy Obsidian gateway: local plugin, `pbg_obsidian` schema, gateway API, local-first course sync, and the first Assignment Coach workflow.

**Architecture:** The Obsidian plugin is a local-first gateway for one dedicated PBG Vault. The VPS API owns authentication, device registration, subscription/credit checks, course manifests, and workflow routing. Supabase/Postgres stores `academy_core` as the source of truth and `pbg_obsidian` as the plugin metadata layer; the vault stores course files, dashboard cache, and workflow results.

**Tech Stack:** TypeScript, Obsidian plugin API, Node.js gateway API, Postgres/Supabase SQL migrations, Redis/BullMQ for queued workflow execution, Vitest for unit tests, Playwright or Obsidian manual smoke testing for plugin load verification.

---

## Blueprint Scope

This plan is intentionally split into structural phases. Each phase has a narrow output, a verification gate, and a rollback-friendly commit boundary. Build phases should be completed in order because later phases depend on contracts established earlier.

The project now lives at:

```text
https://github.com/thepbgacademy-hub/pbg-obsidian-academy-gateway
```

Local build path:

```text
C:\tmp\pbg-obsidian-academy-gateway
```

Test Obsidian vault:

```text
E:\Obsidian\PBG Plug in
```

Academy Core reference migration:

```text
E:\Obsidian\main_databse_design\migrations\001_create_academy_core.sql
```

## Structural Decisions

- The plugin supports one active student, one registered PBG Vault, and one active device for the POC.
- Normal course content is downloaded as local markdown into the vault.
- The dashboard can call the VPS for account status and manifests, but it does not send note bodies on open.
- Note bodies are sent only after explicit workflow action confirmation.
- `academy_core.students.id` is the canonical `student_id`.
- `pbg_obsidian` stores plugin metadata and workflow metadata only.
- Provider credentials are outside this POC except for connector status stubs.

## Target Repository Structure

```text
pbg-obsidian-academy-gateway/
  README.md
  package.json
  tsconfig.json
  vitest.config.ts
  .gitignore
  docs/
    superpowers/
      specs/
        2026-05-12-pbg-obsidian-academy-gateway-design.md
      plans/
        2026-05-12-pbg-obsidian-academy-gateway-blueprint.md
    api/
      openapi-poc.yaml
    database/
      pbg_obsidian_schema.md
  migrations/
    pbg_obsidian/
      001_create_pbg_obsidian.sql
  packages/
    shared/
      src/
        contracts.ts
        courseManifest.ts
        errors.ts
        workflowContracts.ts
      tests/
        contracts.test.ts
        courseManifest.test.ts
    gateway-api/
      src/
        app.ts
        server.ts
        config.ts
        db.ts
        auth/
          passwordAuth.ts
          sessions.ts
          deviceRegistration.ts
        academy/
          accountStatus.ts
          entitlements.ts
          credits.ts
        courses/
          manifest.ts
          sampleContent.ts
        workflows/
          assignmentCoach.ts
          workflowRuns.ts
          queue.ts
        routes/
          authRoutes.ts
          dashboardRoutes.ts
          courseRoutes.ts
          workflowRoutes.ts
      tests/
        authRoutes.test.ts
        deviceRegistration.test.ts
        courseManifest.test.ts
        assignmentCoach.test.ts
    obsidian-plugin/
      manifest.json
      styles.css
      esbuild.config.mjs
      src/
        main.ts
        settings.ts
        apiClient.ts
        vaultScope.ts
        onboarding.ts
        dashboardView.ts
        courseSync.ts
        workflowActions.ts
        contextPreview.ts
        localState.ts
      tests/
        onboarding.test.ts
        vaultScope.test.ts
        courseSync.test.ts
        contextPreview.test.ts
  scripts/
    install-plugin.ps1
    smoke-test-plugin.ps1
```

## API Contract Map

All POC routes are server-side gateway routes. The Obsidian plugin never talks directly to Supabase/Postgres.

```text
POST /api/auth/login
POST /api/auth/refresh
POST /api/auth/logout
POST /api/devices/register
GET  /api/dashboard/me
GET  /api/courses/manifest
POST /api/workflows/assignment-coach/preview
POST /api/workflows/assignment-coach/run
GET  /api/workflows/runs/:runId
```

### Login Request

```json
{
  "username": "pbg_test_student",
  "password": "pbg-test-password",
  "vaultId": "sha256-vault-id",
  "deviceFingerprint": "sha256-device-fingerprint",
  "pluginVersion": "0.1.0"
}
```

### Login Response

```json
{
  "accessToken": "short-lived-token",
  "refreshToken": "device-refresh-token",
  "student": {
    "studentId": "00000000-0000-4000-8000-000000000101",
    "displayName": "PBG Test Student",
    "tier": "pro",
    "standingGood": true,
    "creditBalance": 250
  },
  "device": {
    "deviceId": "uuid",
    "vaultId": "sha256-vault-id",
    "status": "active"
  }
}
```

### Dashboard Response

```json
{
  "student": {
    "studentId": "00000000-0000-4000-8000-000000000101",
    "tier": "pro",
    "standingGood": true,
    "creditBalance": 250
  },
  "workflows": [
    {
      "slug": "assignment-coach",
      "name": "Assignment Coach",
      "enabled": true,
      "creditCost": 1
    }
  ],
  "courseManifestVersion": "2026-05-12-poc"
}
```

### Course Manifest Response

```json
{
  "manifestVersion": "2026-05-12-poc",
  "files": [
    {
      "path": "PBG/Courses/pbg-academy-foundations/orientation/telegram-enrollment-to-academy.md",
      "sha256": "content-hash",
      "kind": "lesson",
      "title": "Telegram Enrollment to Academy",
      "body": "---\ntype: lesson\ncourse: pbg-academy-foundations\n---\n# Telegram Enrollment to Academy\n"
    },
    {
      "path": "PBG/Assignments/connect-first-workflow.md",
      "sha256": "content-hash",
      "kind": "assignment",
      "title": "Connect First Workflow",
      "body": "---\ntype: assignment\nworkflow: assignment-coach\n---\n# Connect First Workflow\n"
    }
  ]
}
```

### Assignment Coach Run Request

```json
{
  "assignmentPath": "PBG/Assignments/connect-first-workflow.md",
  "assignmentTitle": "Connect First Workflow",
  "assignmentBody": "# Connect First Workflow\nStudent note content...",
  "relatedContext": [
    {
      "path": "PBG/Courses/pbg-academy-foundations/orientation/telegram-enrollment-to-academy.md",
      "title": "Telegram Enrollment to Academy",
      "body": "# Telegram Enrollment to Academy\nCourse context..."
    }
  ],
  "localMetadata": {
    "taskCount": 3,
    "completedTaskCount": 1,
    "tags": ["academy"]
  }
}
```

### Assignment Coach Run Response

```json
{
  "runId": "uuid",
  "status": "completed",
  "creditCost": 1,
  "result": {
    "title": "Assignment Coach Result",
    "summary": "You are ready to complete the first workflow connection assignment.",
    "nextSteps": [
      "Confirm the PBG Vault folders exist.",
      "Sync the starter course manifest.",
      "Run the Assignment Coach workflow from the assignment note."
    ],
    "markdown": "# Assignment Coach Result\n\n## Summary\nYou are ready to complete the first workflow connection assignment.\n"
  }
}
```

## Database Blueprint

Create the `pbg_obsidian` schema in its own migration.

```sql
CREATE SCHEMA IF NOT EXISTS pbg_obsidian;

CREATE TYPE pbg_obsidian.device_status AS ENUM ('active', 'replaced', 'revoked');
CREATE TYPE pbg_obsidian.session_status AS ENUM ('active', 'expired', 'revoked');
CREATE TYPE pbg_obsidian.workflow_run_status AS ENUM ('queued', 'running', 'completed', 'failed', 'canceled');

CREATE TABLE pbg_obsidian.plugin_devices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES academy_core.students(id) ON DELETE CASCADE,
  vault_id_hash text NOT NULL,
  device_fingerprint_hash text NOT NULL,
  plugin_version text NOT NULL,
  status pbg_obsidian.device_status NOT NULL DEFAULT 'active',
  registered_at timestamptz NOT NULL DEFAULT now(),
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  replaced_at timestamptz,
  revoked_at timestamptz,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  CONSTRAINT plugin_devices_hash_check CHECK (length(vault_id_hash) >= 32 AND length(device_fingerprint_hash) >= 32)
);

CREATE UNIQUE INDEX plugin_devices_one_active_student_idx
  ON pbg_obsidian.plugin_devices(student_id)
  WHERE status = 'active';

CREATE TABLE pbg_obsidian.plugin_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES academy_core.students(id) ON DELETE CASCADE,
  device_id uuid NOT NULL REFERENCES pbg_obsidian.plugin_devices(id) ON DELETE CASCADE,
  refresh_token_hash text NOT NULL UNIQUE,
  status pbg_obsidian.session_status NOT NULL DEFAULT 'active',
  issued_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL,
  last_used_at timestamptz,
  revoked_at timestamptz,
  CONSTRAINT plugin_sessions_token_hash_check CHECK (length(refresh_token_hash) >= 32),
  CONSTRAINT plugin_sessions_expiry_check CHECK (expires_at > issued_at)
);

CREATE TABLE pbg_obsidian.workflow_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES academy_core.students(id) ON DELETE CASCADE,
  device_id uuid NOT NULL REFERENCES pbg_obsidian.plugin_devices(id) ON DELETE RESTRICT,
  workflow_slug text NOT NULL,
  status pbg_obsidian.workflow_run_status NOT NULL DEFAULT 'queued',
  credit_cost numeric(12, 2) NOT NULL DEFAULT 0,
  assignment_path text,
  context_summary jsonb NOT NULL DEFAULT '{}'::jsonb,
  result_summary jsonb NOT NULL DEFAULT '{}'::jsonb,
  error_code text,
  error_message text,
  created_at timestamptz NOT NULL DEFAULT now(),
  started_at timestamptz,
  completed_at timestamptz,
  CONSTRAINT workflow_runs_slug_check CHECK (workflow_slug ~ '^[a-z0-9][a-z0-9-]*$'),
  CONSTRAINT workflow_runs_credit_cost_check CHECK (credit_cost >= 0)
);

CREATE INDEX workflow_runs_student_created_idx
  ON pbg_obsidian.workflow_runs(student_id, created_at DESC);

CREATE TABLE pbg_obsidian.workflow_run_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_run_id uuid NOT NULL REFERENCES pbg_obsidian.workflow_runs(id) ON DELETE CASCADE,
  event_type text NOT NULL,
  event_data jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT workflow_run_events_type_check CHECK (event_type ~ '^[a-z0-9][a-z0-9_.:-]*$')
);

CREATE TABLE pbg_obsidian.saved_result_index (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES academy_core.students(id) ON DELETE CASCADE,
  workflow_run_id uuid NOT NULL REFERENCES pbg_obsidian.workflow_runs(id) ON DELETE CASCADE,
  local_path text NOT NULL,
  title text NOT NULL,
  content_hash text NOT NULL,
  saved_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT saved_result_content_hash_check CHECK (length(content_hash) >= 32)
);
```

Enable RLS on all `pbg_obsidian` tables. For the POC, route all access through the server API, not direct client Data API access.

```sql
ALTER TABLE pbg_obsidian.plugin_devices ENABLE ROW LEVEL SECURITY;
ALTER TABLE pbg_obsidian.plugin_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE pbg_obsidian.workflow_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE pbg_obsidian.workflow_run_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE pbg_obsidian.saved_result_index ENABLE ROW LEVEL SECURITY;
```

## Phase 0: Repository Foundation

**Purpose:** Establish the monorepo skeleton, shared tooling, and repeatable commands before feature code exists.

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `vitest.config.ts`
- Create: `.gitignore`
- Create: `packages/shared/package.json`
- Create: `packages/shared/src/contracts.ts`
- Create: `packages/shared/tests/contracts.test.ts`

- [ ] **Step 1: Add workspace package manifest**

Create `package.json`:

```json
{
  "name": "pbg-obsidian-academy-gateway",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "workspaces": [
    "packages/*"
  ],
  "scripts": {
    "build": "npm run build --workspaces --if-present",
    "test": "vitest run",
    "test:watch": "vitest",
    "typecheck": "tsc --noEmit"
  },
  "devDependencies": {
    "@types/node": "^20.12.12",
    "typescript": "^5.5.4",
    "vitest": "^2.0.5"
  }
}
```

- [ ] **Step 2: Add TypeScript config**

Create `tsconfig.json`:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "strict": true,
    "esModuleInterop": true,
    "forceConsistentCasingInFileNames": true,
    "skipLibCheck": true,
    "resolveJsonModule": true,
    "noUncheckedIndexedAccess": true
  },
  "include": [
    "packages/**/*.ts",
    "vitest.config.ts"
  ]
}
```

- [ ] **Step 3: Add Vitest config**

Create `vitest.config.ts`:

```ts
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["packages/**/*.test.ts"],
    globals: true
  }
});
```

- [ ] **Step 4: Add repository ignore rules**

Create `.gitignore`:

```gitignore
node_modules/
dist/
.env
.env.*
!.env.example
*.tsbuildinfo
coverage/
```

- [ ] **Step 5: Add first shared contract test**

Create `packages/shared/package.json`:

```json
{
  "name": "@pbg/shared",
  "version": "0.1.0",
  "type": "module",
  "private": true,
  "main": "src/contracts.ts"
}
```

Create `packages/shared/tests/contracts.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { WORKFLOW_SLUGS } from "../src/contracts";

describe("shared contracts", () => {
  it("defines the first workflow slug", () => {
    expect(WORKFLOW_SLUGS.assignmentCoach).toBe("assignment-coach");
  });
});
```

- [ ] **Step 6: Run the failing test**

Run:

```powershell
npm install
npm test -- packages/shared/tests/contracts.test.ts
```

Expected: fails because `packages/shared/src/contracts.ts` does not exist.

- [ ] **Step 7: Add minimal shared contract implementation**

Create `packages/shared/src/contracts.ts`:

```ts
export const WORKFLOW_SLUGS = {
  assignmentCoach: "assignment-coach",
  courseCompanion: "course-companion",
  progressReviewer: "progress-reviewer"
} as const;

export type WorkflowSlug = (typeof WORKFLOW_SLUGS)[keyof typeof WORKFLOW_SLUGS];
```

- [ ] **Step 8: Verify foundation**

Run:

```powershell
npm test
npm run typecheck
```

Expected: both pass.

- [ ] **Step 9: Commit foundation**

```powershell
git add package.json package-lock.json tsconfig.json vitest.config.ts .gitignore packages/shared
git commit -m "chore: add TypeScript workspace foundation"
```

**Gate:** The repo installs dependencies, runs tests, and typechecks.

## Phase 1: `pbg_obsidian` Database Migration

**Purpose:** Create the plugin metadata schema with one-device enforcement and workflow run tracking.

**Files:**
- Create: `migrations/pbg_obsidian/001_create_pbg_obsidian.sql`
- Create: `docs/database/pbg_obsidian_schema.md`

- [ ] **Step 1: Create migration file**

Create `migrations/pbg_obsidian/001_create_pbg_obsidian.sql` using the SQL from the Database Blueprint section.

- [ ] **Step 2: Add schema documentation**

Create `docs/database/pbg_obsidian_schema.md`:

```md
# pbg_obsidian Schema

`pbg_obsidian` stores metadata for the Obsidian academy gateway only. It references `academy_core.students(id)` and does not store full vault contents, raw note bodies, or raw provider secrets.

## Tables

- `plugin_devices`: one active vault/device registration per student for the POC.
- `plugin_sessions`: hashed refresh-token sessions tied to a registered device.
- `workflow_runs`: one row per server-side workflow attempt.
- `workflow_run_events`: small structured lifecycle events for support and debugging.
- `saved_result_index`: index of workflow results the plugin saved locally in the vault.

## Access Model

The Obsidian plugin does not access these tables directly. The gateway API performs all reads and writes server-side.
```

- [ ] **Step 3: Verify migration against a database with Academy Core installed**

Run against a disposable Postgres/Supabase database that already applied `academy_core`:

```powershell
psql "$env:DATABASE_URL" -f migrations/pbg_obsidian/001_create_pbg_obsidian.sql
```

Expected: migration applies without errors.

- [ ] **Step 4: Verify one active device constraint**

Run:

```sql
INSERT INTO pbg_obsidian.plugin_devices (
  student_id,
  vault_id_hash,
  device_fingerprint_hash,
  plugin_version
) VALUES (
  '00000000-0000-4000-8000-000000000101',
  repeat('a', 64),
  repeat('b', 64),
  '0.1.0'
);

INSERT INTO pbg_obsidian.plugin_devices (
  student_id,
  vault_id_hash,
  device_fingerprint_hash,
  plugin_version
) VALUES (
  '00000000-0000-4000-8000-000000000101',
  repeat('c', 64),
  repeat('d', 64),
  '0.1.0'
);
```

Expected: second insert fails on `plugin_devices_one_active_student_idx`.

- [ ] **Step 5: Commit schema**

```powershell
git add migrations/pbg_obsidian/001_create_pbg_obsidian.sql docs/database/pbg_obsidian_schema.md
git commit -m "feat: add pbg_obsidian schema migration"
```

**Gate:** The migration applies after Academy Core and enforces one active device per student.

## Phase 2: Shared API Contracts

**Purpose:** Lock request/response shapes before building the server and plugin separately.

**Files:**
- Create: `packages/shared/src/courseManifest.ts`
- Create: `packages/shared/src/workflowContracts.ts`
- Create: `packages/shared/src/errors.ts`
- Modify: `packages/shared/src/contracts.ts`
- Create: `packages/shared/tests/courseManifest.test.ts`
- Create: `docs/api/openapi-poc.yaml`

- [ ] **Step 1: Add course manifest tests**

Create `packages/shared/tests/courseManifest.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { createPocCourseManifest } from "../src/courseManifest";

describe("course manifest", () => {
  it("returns local-first PBG files", () => {
    const manifest = createPocCourseManifest();

    expect(manifest.manifestVersion).toBe("2026-05-12-poc");
    expect(manifest.files.map((file) => file.path)).toContain(
      "PBG/Assignments/connect-first-workflow.md"
    );
    expect(manifest.files.every((file) => file.path.startsWith("PBG/"))).toBe(true);
  });
});
```

- [ ] **Step 2: Run failing shared tests**

Run:

```powershell
npm test -- packages/shared/tests/courseManifest.test.ts
```

Expected: fails because `createPocCourseManifest` does not exist.

- [ ] **Step 3: Add manifest and workflow contract code**

Create `packages/shared/src/courseManifest.ts`:

```ts
export interface CourseManifestFile {
  path: string;
  sha256: string;
  kind: "lesson" | "assignment" | "template";
  title: string;
  body: string;
}

export interface CourseManifest {
  manifestVersion: string;
  files: CourseManifestFile[];
}

export function createPocCourseManifest(): CourseManifest {
  return {
    manifestVersion: "2026-05-12-poc",
    files: [
      {
        path: "PBG/Courses/pbg-academy-foundations/orientation/telegram-enrollment-to-academy.md",
        sha256: "poc-lesson-hash",
        kind: "lesson",
        title: "Telegram Enrollment to Academy",
        body:
          "---\n" +
          "type: lesson\n" +
          "course: pbg-academy-foundations\n" +
          "module: orientation\n" +
          "---\n\n" +
          "# Telegram Enrollment to Academy\n\n" +
          "This starter lesson confirms the PBG Vault is connected to the academy gateway.\n"
      },
      {
        path: "PBG/Assignments/connect-first-workflow.md",
        sha256: "poc-assignment-hash",
        kind: "assignment",
        title: "Connect First Workflow",
        body:
          "---\n" +
          "type: assignment\n" +
          "workflow: assignment-coach\n" +
          "---\n\n" +
          "# Connect First Workflow\n\n" +
          "- [ ] Confirm the dashboard opens\n" +
          "- [ ] Sync the starter course\n" +
          "- [ ] Run Assignment Coach\n"
      }
    ]
  };
}
```

Create `packages/shared/src/workflowContracts.ts`:

```ts
export interface AssignmentCoachContextItem {
  path: string;
  title: string;
  body: string;
}

export interface AssignmentCoachRunRequest {
  assignmentPath: string;
  assignmentTitle: string;
  assignmentBody: string;
  relatedContext: AssignmentCoachContextItem[];
  localMetadata: {
    taskCount: number;
    completedTaskCount: number;
    tags: string[];
  };
}

export interface AssignmentCoachRunResponse {
  runId: string;
  status: "completed";
  creditCost: number;
  result: {
    title: string;
    summary: string;
    nextSteps: string[];
    markdown: string;
  };
}
```

Create `packages/shared/src/errors.ts`:

```ts
export class GatewayError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly status: number
  ) {
    super(message);
  }
}
```

- [ ] **Step 4: Verify shared contracts**

Create `docs/api/openapi-poc.yaml`:

```yaml
openapi: 3.1.0
info:
  title: PBG Obsidian Academy Gateway POC API
  version: 0.1.0
paths:
  /api/auth/login:
    post:
      summary: Log in and register the PBG Vault device
      responses:
        "200":
          description: Login accepted
  /api/dashboard/me:
    get:
      summary: Return student standing, credits, workflows, and manifest version
      responses:
        "200":
          description: Dashboard status
  /api/courses/manifest:
    get:
      summary: Return entitled local-first course files
      responses:
        "200":
          description: Course manifest
  /api/workflows/assignment-coach/run:
    post:
      summary: Run Assignment Coach after explicit student action
      responses:
        "200":
          description: Workflow result
```

- [ ] **Step 5: Verify shared contracts**

Run:

```powershell
npm test
npm run typecheck
```

Expected: pass.

- [ ] **Step 6: Commit shared contracts**

```powershell
git add packages/shared docs/api/openapi-poc.yaml
git commit -m "feat: add shared gateway contracts"
```

**Gate:** The server and plugin can import the same manifest and workflow types.

## Phase 3: Gateway API Skeleton

**Purpose:** Build a testable local API that can authenticate the seeded student, return dashboard status, return course manifests, and stub Assignment Coach.

**Files:**
- Create: `packages/gateway-api/package.json`
- Create: `packages/gateway-api/src/app.ts`
- Create: `packages/gateway-api/src/server.ts`
- Create: `packages/gateway-api/src/config.ts`
- Create: `packages/gateway-api/src/routes/authRoutes.ts`
- Create: `packages/gateway-api/src/routes/dashboardRoutes.ts`
- Create: `packages/gateway-api/src/routes/courseRoutes.ts`
- Create: `packages/gateway-api/src/routes/workflowRoutes.ts`
- Create: `packages/gateway-api/tests/authRoutes.test.ts`
- Create: `packages/gateway-api/tests/courseManifest.test.ts`
- Create: `packages/gateway-api/tests/assignmentCoach.test.ts`

- [ ] **Step 1: Add gateway package manifest**

Create `packages/gateway-api/package.json`:

```json
{
  "name": "@pbg/gateway-api",
  "version": "0.1.0",
  "type": "module",
  "private": true,
  "scripts": {
    "dev": "tsx src/server.ts",
    "build": "tsc -p ../../tsconfig.json"
  },
  "dependencies": {
    "@pbg/shared": "file:../shared",
    "@fastify/cors": "^9.0.1",
    "fastify": "^4.28.1",
    "jsonwebtoken": "^9.0.2",
    "pg": "^8.12.0"
  },
  "devDependencies": {
    "@types/jsonwebtoken": "^9.0.6",
    "@types/pg": "^8.11.6",
    "tsx": "^4.16.2"
  }
}
```

- [ ] **Step 2: Write route tests first**

Create `packages/gateway-api/tests/courseManifest.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { buildApp } from "../src/app";

describe("course manifest route", () => {
  it("returns the POC manifest", async () => {
    const app = buildApp();
    const response = await app.inject({ method: "GET", url: "/api/courses/manifest" });

    expect(response.statusCode).toBe(200);
    expect(response.json().manifestVersion).toBe("2026-05-12-poc");
  });
});
```

Create `packages/gateway-api/tests/assignmentCoach.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { buildApp } from "../src/app";

describe("assignment coach route", () => {
  it("returns a structured stub result", async () => {
    const app = buildApp();
    const response = await app.inject({
      method: "POST",
      url: "/api/workflows/assignment-coach/run",
      payload: {
        assignmentPath: "PBG/Assignments/connect-first-workflow.md",
        assignmentTitle: "Connect First Workflow",
        assignmentBody: "# Connect First Workflow",
        relatedContext: [],
        localMetadata: { taskCount: 1, completedTaskCount: 0, tags: ["academy"] }
      }
    });

    expect(response.statusCode).toBe(200);
    expect(response.json().result.nextSteps.length).toBeGreaterThan(0);
  });
});
```

- [ ] **Step 3: Run failing gateway tests**

Run:

```powershell
npm test -- packages/gateway-api/tests/courseManifest.test.ts packages/gateway-api/tests/assignmentCoach.test.ts
```

Expected: fails because `buildApp` does not exist.

- [ ] **Step 4: Implement the local API skeleton**

Create `packages/gateway-api/src/app.ts`:

```ts
import Fastify from "fastify";
import { createPocCourseManifest } from "@pbg/shared/src/courseManifest";
import type { AssignmentCoachRunRequest, AssignmentCoachRunResponse } from "@pbg/shared/src/workflowContracts";

export function buildApp() {
  const app = Fastify({ logger: false });

  app.get("/api/courses/manifest", async () => createPocCourseManifest());

  app.post<{ Body: AssignmentCoachRunRequest }>(
    "/api/workflows/assignment-coach/run",
    async (request): Promise<AssignmentCoachRunResponse> => {
      return {
        runId: "00000000-0000-4000-8000-000000000201",
        status: "completed",
        creditCost: 1,
        result: {
          title: "Assignment Coach Result",
          summary: `Reviewed ${request.body.assignmentTitle}.`,
          nextSteps: [
            "Confirm the PBG Vault folders exist.",
            "Sync the starter course manifest.",
            "Run the Assignment Coach workflow from the assignment note."
          ],
          markdown:
            "# Assignment Coach Result\n\n" +
            `## Summary\nReviewed ${request.body.assignmentTitle}.\n`
        }
      };
    }
  );

  return app;
}
```

Create `packages/gateway-api/src/server.ts`:

```ts
import { buildApp } from "./app";

const app = buildApp();
const port = Number(process.env.PORT ?? 8787);

await app.listen({ port, host: "0.0.0.0" });
```

- [ ] **Step 5: Verify gateway skeleton**

Run:

```powershell
npm test -- packages/gateway-api/tests/courseManifest.test.ts packages/gateway-api/tests/assignmentCoach.test.ts
npm run typecheck
```

Expected: pass.

- [ ] **Step 6: Commit gateway skeleton**

```powershell
git add packages/gateway-api package.json package-lock.json
git commit -m "feat: add gateway API skeleton"
```

**Gate:** Local API tests pass and route contracts match the shared package.

## Phase 4: Obsidian Plugin Shell And Onboarding

**Purpose:** Build the local plugin shell, install it into the test vault, open a dashboard view, and create the PBG folder structure idempotently.

**Files:**
- Create: `packages/obsidian-plugin/package.json`
- Create: `packages/obsidian-plugin/manifest.json`
- Create: `packages/obsidian-plugin/styles.css`
- Create: `packages/obsidian-plugin/esbuild.config.mjs`
- Create: `packages/obsidian-plugin/src/main.ts`
- Create: `packages/obsidian-plugin/src/onboarding.ts`
- Create: `packages/obsidian-plugin/src/dashboardView.ts`
- Create: `packages/obsidian-plugin/tests/onboarding.test.ts`
- Create: `scripts/install-plugin.ps1`

- [ ] **Step 1: Add onboarding unit test**

Create `packages/obsidian-plugin/tests/onboarding.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { PBG_REQUIRED_PATHS } from "../src/onboarding";

describe("PBG onboarding", () => {
  it("defines the required vault paths", () => {
    expect(PBG_REQUIRED_PATHS).toEqual([
      "PBG",
      "PBG/Dashboard",
      "PBG/Courses",
      "PBG/Assignments",
      "PBG/Notes",
      "PBG/Workflow Results",
      "PBG/Templates",
      "PBG/System"
    ]);
  });
});
```

- [ ] **Step 2: Run failing onboarding test**

Run:

```powershell
npm test -- packages/obsidian-plugin/tests/onboarding.test.ts
```

Expected: fails because `onboarding.ts` does not exist.

- [ ] **Step 3: Add plugin package and onboarding constants**

Create `packages/obsidian-plugin/package.json`:

```json
{
  "name": "pbg-academy-gateway",
  "version": "0.1.0",
  "type": "module",
  "private": true,
  "scripts": {
    "build": "node esbuild.config.mjs"
  },
  "devDependencies": {
    "esbuild": "^0.23.0",
    "obsidian": "^1.7.2"
  }
}
```

Create `packages/obsidian-plugin/src/onboarding.ts`:

```ts
export const PBG_REQUIRED_PATHS = [
  "PBG",
  "PBG/Dashboard",
  "PBG/Courses",
  "PBG/Assignments",
  "PBG/Notes",
  "PBG/Workflow Results",
  "PBG/Templates",
  "PBG/System"
] as const;
```

- [ ] **Step 4: Add Obsidian manifest and dashboard view**

Create `packages/obsidian-plugin/manifest.json`:

```json
{
  "id": "pbg-academy-gateway",
  "name": "PBG Academy Gateway",
  "version": "0.1.0",
  "minAppVersion": "1.5.0",
  "description": "Local-first PBG Academy dashboard and workflow gateway.",
  "author": "PBG Academy",
  "isDesktopOnly": true
}
```

Create `packages/obsidian-plugin/src/dashboardView.ts`:

```ts
import { ItemView } from "obsidian";

export const VIEW_TYPE_PBG_DASHBOARD = "pbg-academy-dashboard";

export class PbgDashboardView extends ItemView {
  getViewType(): string {
    return VIEW_TYPE_PBG_DASHBOARD;
  }

  getDisplayText(): string {
    return "PBG Academy";
  }

  async onOpen(): Promise<void> {
    const container = this.containerEl.children[1];
    container.empty();
    container.createEl("h1", { text: "PBG Academy Dashboard" });
    container.createEl("p", { text: "Gateway shell loaded." });
  }
}
```

Create `packages/obsidian-plugin/src/main.ts`:

```ts
import { Plugin } from "obsidian";
import { PbgDashboardView, VIEW_TYPE_PBG_DASHBOARD } from "./dashboardView";
import { PBG_REQUIRED_PATHS } from "./onboarding";

export default class PbgAcademyGatewayPlugin extends Plugin {
  async onload(): Promise<void> {
    this.registerView(VIEW_TYPE_PBG_DASHBOARD, (leaf) => new PbgDashboardView(leaf));

    this.addCommand({
      id: "open-pbg-academy-dashboard",
      name: "Open PBG Academy Dashboard",
      callback: async () => {
        await this.ensurePbgFolders();
        await this.activateDashboard();
      }
    });
  }

  private async ensurePbgFolders(): Promise<void> {
    for (const path of PBG_REQUIRED_PATHS) {
      if (!this.app.vault.getAbstractFileByPath(path)) {
        await this.app.vault.createFolder(path);
      }
    }
  }

  private async activateDashboard(): Promise<void> {
    const leaf = this.app.workspace.getLeaf(true);
    await leaf.setViewState({ type: VIEW_TYPE_PBG_DASHBOARD, active: true });
    this.app.workspace.revealLeaf(leaf);
  }
}
```

Create `packages/obsidian-plugin/esbuild.config.mjs`:

```js
import esbuild from "esbuild";

await esbuild.build({
  entryPoints: ["src/main.ts"],
  bundle: true,
  external: ["obsidian"],
  format: "cjs",
  target: "es2018",
  outfile: "dist/main.js",
  sourcemap: "inline"
});
```

Create `packages/obsidian-plugin/styles.css`:

```css
.pbg-dashboard {
  padding: 16px;
}
```

- [ ] **Step 5: Add plugin install script**

Create `scripts/install-plugin.ps1`:

```powershell
$ErrorActionPreference = "Stop"

$RepoRoot = Split-Path -Parent $PSScriptRoot
$PluginRoot = Join-Path $RepoRoot "packages\obsidian-plugin"
$VaultPluginRoot = "E:\Obsidian\PBG Plug in\.obsidian\plugins\pbg-academy-gateway"

New-Item -ItemType Directory -Force -Path $VaultPluginRoot | Out-Null
Copy-Item -Force (Join-Path $PluginRoot "manifest.json") $VaultPluginRoot
Copy-Item -Force (Join-Path $PluginRoot "styles.css") $VaultPluginRoot
Copy-Item -Force (Join-Path $PluginRoot "dist\main.js") $VaultPluginRoot

Write-Host "Installed PBG Academy Gateway plugin to $VaultPluginRoot"
```

- [ ] **Step 6: Build and install plugin**

Run:

```powershell
npm install
npm --workspace pbg-academy-gateway run build
.\scripts\install-plugin.ps1
```

Expected: plugin files appear in `E:\Obsidian\PBG Plug in\.obsidian\plugins\pbg-academy-gateway`.

- [ ] **Step 7: Verify in Obsidian**

Manual verification:

```text
Open E:\Obsidian\PBG Plug in in Obsidian.
Enable community plugins if needed.
Enable PBG Academy Gateway.
Run command: Open PBG Academy Dashboard.
Confirm the dashboard opens and PBG folders are created.
```

- [ ] **Step 8: Commit plugin shell**

```powershell
git add packages/obsidian-plugin scripts/install-plugin.ps1 package.json package-lock.json
git commit -m "feat: add Obsidian plugin shell"
```

**Gate:** Obsidian loads the plugin, opens the dashboard command, and creates the vault folders.

## Phase 5: Plugin API Client And Course Sync

**Purpose:** Connect the plugin to the gateway API, pull the course manifest, and write local-first course files into the PBG Vault.

**Files:**
- Create: `packages/obsidian-plugin/src/apiClient.ts`
- Create: `packages/obsidian-plugin/src/courseSync.ts`
- Create: `packages/obsidian-plugin/tests/courseSync.test.ts`
- Modify: `packages/obsidian-plugin/src/main.ts`

- [ ] **Step 1: Add course sync test**

Create `packages/obsidian-plugin/tests/courseSync.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { createPocCourseManifest } from "@pbg/shared/src/courseManifest";
import { getManifestWritePlan } from "../src/courseSync";

describe("course sync", () => {
  it("plans writes for manifest files inside PBG", () => {
    const plan = getManifestWritePlan(createPocCourseManifest());

    expect(plan).toHaveLength(2);
    expect(plan.every((item) => item.path.startsWith("PBG/"))).toBe(true);
  });
});
```

- [ ] **Step 2: Run failing course sync test**

Run:

```powershell
npm test -- packages/obsidian-plugin/tests/courseSync.test.ts
```

Expected: fails because `courseSync.ts` does not exist.

- [ ] **Step 3: Add course sync planner**

Create `packages/obsidian-plugin/src/courseSync.ts`:

```ts
import type { CourseManifest } from "@pbg/shared/src/courseManifest";

export interface ManifestWritePlanItem {
  path: string;
  body: string;
}

export function getManifestWritePlan(manifest: CourseManifest): ManifestWritePlanItem[] {
  return manifest.files.map((file) => {
    if (!file.path.startsWith("PBG/")) {
      throw new Error(`Refusing to write manifest file outside PBG scope: ${file.path}`);
    }

    return {
      path: file.path,
      body: file.body
    };
  });
}
```

Create `packages/obsidian-plugin/src/apiClient.ts`:

```ts
import type { CourseManifest } from "@pbg/shared/src/courseManifest";

export class PbgGatewayApiClient {
  constructor(private readonly baseUrl: string) {}

  async getCourseManifest(): Promise<CourseManifest> {
    const response = await fetch(`${this.baseUrl}/api/courses/manifest`);
    if (!response.ok) {
      throw new Error(`Course manifest request failed: ${response.status}`);
    }

    return response.json() as Promise<CourseManifest>;
  }
}
```

- [ ] **Step 4: Wire sync command into plugin**

Modify `packages/obsidian-plugin/src/main.ts` to add a command:

```ts
this.addCommand({
  id: "sync-pbg-course-manifest",
  name: "Sync PBG Course Manifest",
  callback: async () => {
    const client = new PbgGatewayApiClient("http://localhost:8787");
    const manifest = await client.getCourseManifest();
    const plan = getManifestWritePlan(manifest);

    for (const item of plan) {
      const existing = this.app.vault.getAbstractFileByPath(item.path);
      if (existing) {
        continue;
      }

      const parentPath = item.path.split("/").slice(0, -1).join("/");
      if (parentPath && !this.app.vault.getAbstractFileByPath(parentPath)) {
        await this.app.vault.createFolder(parentPath);
      }

      await this.app.vault.create(item.path, item.body);
    }
  }
});
```

Also add imports:

```ts
import { PbgGatewayApiClient } from "./apiClient";
import { getManifestWritePlan } from "./courseSync";
```

- [ ] **Step 5: Verify course sync**

Run:

```powershell
npm test -- packages/obsidian-plugin/tests/courseSync.test.ts
npm --workspace @pbg/gateway-api run dev
```

In another terminal:

```powershell
npm --workspace pbg-academy-gateway run build
.\scripts\install-plugin.ps1
```

Manual verification:

```text
In Obsidian, run Sync PBG Course Manifest.
Confirm lesson and assignment files are created under PBG/.
```

- [ ] **Step 6: Commit course sync**

```powershell
git add packages/obsidian-plugin packages/shared package.json package-lock.json
git commit -m "feat: sync local-first course manifest"
```

**Gate:** Plugin writes entitled course files locally from the gateway manifest.

## Phase 6: Login, Sessions, And Device Registration

**Purpose:** Replace stub access with real Academy Core authentication and one active device enforcement.

**Files:**
- Modify: `packages/gateway-api/src/app.ts`
- Create: `packages/gateway-api/src/db.ts`
- Create: `packages/gateway-api/src/auth/passwordAuth.ts`
- Create: `packages/gateway-api/src/auth/sessions.ts`
- Create: `packages/gateway-api/src/auth/deviceRegistration.ts`
- Create: `packages/gateway-api/tests/authRoutes.test.ts`
- Create: `packages/gateway-api/tests/deviceRegistration.test.ts`
- Modify: `packages/obsidian-plugin/src/settings.ts`
- Modify: `packages/obsidian-plugin/src/apiClient.ts`

- [ ] **Step 1: Add auth route test with injected fake services**

Create `packages/gateway-api/tests/authRoutes.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { buildApp } from "../src/app";

describe("auth route", () => {
  it("logs in the seeded student through injected services", async () => {
    const app = buildApp({
      authService: {
        login: async () => ({
          accessToken: "access-token",
          refreshToken: "refresh-token",
          student: {
            studentId: "00000000-0000-4000-8000-000000000101",
            displayName: "PBG Test Student",
            tier: "pro",
            standingGood: true,
            creditBalance: 250
          },
          device: {
            deviceId: "00000000-0000-4000-8000-000000000301",
            vaultId: "vault-hash",
            status: "active"
          }
        })
      }
    });

    const response = await app.inject({
      method: "POST",
      url: "/api/auth/login",
      payload: {
        username: "pbg_test_student",
        password: "pbg-test-password",
        vaultId: "vault-hash",
        deviceFingerprint: "device-hash",
        pluginVersion: "0.1.0"
      }
    });

    expect(response.statusCode).toBe(200);
    expect(response.json().student.tier).toBe("pro");
  });
});
```

- [ ] **Step 2: Run failing auth test**

Run:

```powershell
npm test -- packages/gateway-api/tests/authRoutes.test.ts
```

Expected: fails until `buildApp` accepts injected services and implements `/api/auth/login`.

- [ ] **Step 3: Implement auth route injection contract**

Modify `packages/gateway-api/src/app.ts` by adding the `AuthService` and `AppServices` interfaces, changing `buildApp()` to `buildApp(services: AppServices = {})`, and registering this login route before the existing course and workflow routes:

```ts
interface AuthService {
  login(input: {
    username: string;
    password: string;
    vaultId: string;
    deviceFingerprint: string;
    pluginVersion: string;
  }): Promise<unknown>;
}

interface AppServices {
  authService?: AuthService;
}

export function buildApp(services: AppServices = {}) {
  const app = Fastify({ logger: false });

  app.post("/api/auth/login", async (request) => {
    if (!services.authService) {
      return {
        accessToken: "poc-access-token",
        refreshToken: "poc-refresh-token",
        student: {
          studentId: "00000000-0000-4000-8000-000000000101",
          displayName: "PBG Test Student",
          tier: "pro",
          standingGood: true,
          creditBalance: 250
        },
        device: {
          deviceId: "00000000-0000-4000-8000-000000000301",
          vaultId: "poc-vault",
          status: "active"
        }
      };
    }

    return services.authService.login(request.body as any);
  });

  app.get("/api/courses/manifest", async () => createPocCourseManifest());

  app.post<{ Body: AssignmentCoachRunRequest }>(
    "/api/workflows/assignment-coach/run",
    async (request): Promise<AssignmentCoachRunResponse> => {
      return {
        runId: "00000000-0000-4000-8000-000000000201",
        status: "completed",
        creditCost: 1,
        result: {
          title: "Assignment Coach Result",
          summary: `Reviewed ${request.body.assignmentTitle}.`,
          nextSteps: [
            "Confirm the PBG Vault folders exist.",
            "Sync the starter course manifest.",
            "Run the Assignment Coach workflow from the assignment note."
          ],
          markdown:
            "# Assignment Coach Result\n\n" +
            `## Summary\nReviewed ${request.body.assignmentTitle}.\n`
        }
      };
    }
  );

  return app;
}
```

- [ ] **Step 4: Add real service files**

Create `packages/gateway-api/src/db.ts`:

```ts
import pg from "pg";

export function createPool(connectionString = process.env.DATABASE_URL): pg.Pool {
  if (!connectionString) {
    throw new Error("DATABASE_URL is required");
  }

  return new pg.Pool({ connectionString });
}
```

Create `packages/gateway-api/src/auth/passwordAuth.ts`:

```ts
export interface AuthenticatedStudent {
  studentId: string;
  displayName: string;
  tier: string;
  standingGood: boolean;
  creditBalance: number;
}
```

Create `packages/gateway-api/src/auth/deviceRegistration.ts`:

```ts
export interface RegisteredDevice {
  deviceId: string;
  vaultId: string;
  status: "active";
}
```

Create `packages/gateway-api/src/auth/sessions.ts`:

```ts
import crypto from "node:crypto";

export function createOpaqueToken(): string {
  return crypto.randomBytes(32).toString("base64url");
}

export function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}
```

- [ ] **Step 5: Verify auth route**

Run:

```powershell
npm test -- packages/gateway-api/tests/authRoutes.test.ts
npm run typecheck
```

Expected: pass.

- [ ] **Step 6: Commit auth skeleton**

```powershell
git add packages/gateway-api packages/obsidian-plugin package.json package-lock.json
git commit -m "feat: add login and device registration contracts"
```

**Gate:** Auth route contract exists, is testable, and can later be backed by real Postgres queries.

## Phase 7: Assignment Coach Explicit Workflow

**Purpose:** Ensure note body content is only sent after explicit user action and the result can be saved locally.

**Files:**
- Create: `packages/obsidian-plugin/src/contextPreview.ts`
- Create: `packages/obsidian-plugin/src/workflowActions.ts`
- Create: `packages/obsidian-plugin/tests/contextPreview.test.ts`
- Modify: `packages/obsidian-plugin/src/main.ts`
- Modify: `packages/gateway-api/src/app.ts`

- [ ] **Step 1: Add context preview test**

Create `packages/obsidian-plugin/tests/contextPreview.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { createContextPreviewMessage } from "../src/contextPreview";

describe("context preview", () => {
  it("summarizes outbound note context before workflow run", () => {
    expect(createContextPreviewMessage(1, 2)).toBe("Sending 1 assignment note and 2 related course notes.");
  });
});
```

- [ ] **Step 2: Run failing preview test**

Run:

```powershell
npm test -- packages/obsidian-plugin/tests/contextPreview.test.ts
```

Expected: fails because `contextPreview.ts` does not exist.

- [ ] **Step 3: Implement preview helper**

Create `packages/obsidian-plugin/src/contextPreview.ts`:

```ts
export function createContextPreviewMessage(assignmentCount: number, relatedCourseNoteCount: number): string {
  const assignmentLabel = assignmentCount === 1 ? "assignment note" : "assignment notes";
  const courseLabel = relatedCourseNoteCount === 1 ? "related course note" : "related course notes";
  return `Sending ${assignmentCount} ${assignmentLabel} and ${relatedCourseNoteCount} ${courseLabel}.`;
}
```

- [ ] **Step 4: Add workflow client method**

Modify `packages/obsidian-plugin/src/apiClient.ts`:

```ts
import type { AssignmentCoachRunRequest, AssignmentCoachRunResponse } from "@pbg/shared/src/workflowContracts";

async runAssignmentCoach(payload: AssignmentCoachRunRequest): Promise<AssignmentCoachRunResponse> {
  const response = await fetch(`${this.baseUrl}/api/workflows/assignment-coach/run`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    throw new Error(`Assignment Coach request failed: ${response.status}`);
  }

  return response.json() as Promise<AssignmentCoachRunResponse>;
}
```

- [ ] **Step 5: Add workflow action helper**

Create `packages/obsidian-plugin/src/workflowActions.ts`:

```ts
import type { TFile, Vault } from "obsidian";
import type { PbgGatewayApiClient } from "./apiClient";

export async function runAssignmentCoachForFile(input: {
  file: TFile;
  vault: Vault;
  client: PbgGatewayApiClient;
}): Promise<string> {
  const assignmentBody = await input.vault.read(input.file);
  const response = await input.client.runAssignmentCoach({
    assignmentPath: input.file.path,
    assignmentTitle: input.file.basename,
    assignmentBody,
    relatedContext: [],
    localMetadata: {
      taskCount: (assignmentBody.match(/- \[ \]/g) ?? []).length,
      completedTaskCount: (assignmentBody.match(/- \[x\]/gi) ?? []).length,
      tags: assignmentBody.includes("#academy") ? ["academy"] : []
    }
  });

  const resultPath = `PBG/Workflow Results/${response.runId}.md`;
  await input.vault.create(resultPath, response.result.markdown);
  return resultPath;
}
```

- [ ] **Step 6: Wire Obsidian command**

Add an Obsidian command in `packages/obsidian-plugin/src/main.ts` named `Run Assignment Coach on Active Note`. It should:

```ts
this.addCommand({
  id: "run-assignment-coach-on-active-note",
  name: "Run Assignment Coach on Active Note",
  callback: async () => {
    const file = this.app.workspace.getActiveFile();
    if (!file) {
      new Notice("Open an assignment note before running Assignment Coach.");
      return;
    }

    new Notice(createContextPreviewMessage(1, 0));
    const client = new PbgGatewayApiClient("http://localhost:8787");
    const resultPath = await runAssignmentCoachForFile({
      file,
      vault: this.app.vault,
      client
    });
    new Notice(`Assignment Coach result saved to ${resultPath}`);
  }
});
```

Use this save path:

```ts
const resultPath = `PBG/Workflow Results/${response.runId}.md`;
```

Also add imports:

```ts
import { Notice } from "obsidian";
import { createContextPreviewMessage } from "./contextPreview";
import { runAssignmentCoachForFile } from "./workflowActions";
```

- [ ] **Step 7: Verify explicit action path**

Run:

```powershell
npm test -- packages/obsidian-plugin/tests/contextPreview.test.ts
npm --workspace @pbg/gateway-api run dev
npm --workspace pbg-academy-gateway run build
.\scripts\install-plugin.ps1
```

Manual verification:

```text
Open PBG/Assignments/connect-first-workflow.md.
Run command: Run Assignment Coach on Active Note.
Confirm a workflow result file appears under PBG/Workflow Results/.
Confirm no note body is sent when only opening the dashboard.
```

- [ ] **Step 8: Commit Assignment Coach POC**

```powershell
git add packages/obsidian-plugin packages/gateway-api packages/shared package.json package-lock.json
git commit -m "feat: add explicit Assignment Coach workflow"
```

**Gate:** Assignment note body content is sent only through the explicit command and result markdown is stored locally.

## Phase 8: Dashboard Metrics And POC Hardening

**Purpose:** Make the dashboard useful locally and verify the full story end to end.

**Files:**
- Create: `packages/obsidian-plugin/src/vaultScope.ts`
- Create: `packages/obsidian-plugin/src/localState.ts`
- Modify: `packages/obsidian-plugin/src/dashboardView.ts`
- Create: `scripts/smoke-test-plugin.ps1`
- Modify: `README.md`

- [ ] **Step 1: Add local vault scope helper**

Create `packages/obsidian-plugin/src/vaultScope.ts`:

```ts
export function isPbgScopedPath(path: string): boolean {
  return path === "PBG" || path.startsWith("PBG/");
}
```

- [ ] **Step 2: Add scope test**

Create `packages/obsidian-plugin/tests/vaultScope.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { isPbgScopedPath } from "../src/vaultScope";

describe("vault scope", () => {
  it("allows only PBG scoped paths", () => {
    expect(isPbgScopedPath("PBG/Assignments/a.md")).toBe(true);
    expect(isPbgScopedPath("Personal/journal.md")).toBe(false);
  });
});
```

- [ ] **Step 3: Run scope test**

Run:

```powershell
npm test -- packages/obsidian-plugin/tests/vaultScope.test.ts
```

Expected: pass after helper exists.

- [ ] **Step 4: Update dashboard view**

Modify the dashboard to show:

```text
PBG Academy Dashboard
Connection: Local POC
Vault Scope: PBG/
Actions:
- Sync PBG Course Manifest
- Run Assignment Coach on Active Note
Local Metrics:
- Course files
- Assignment files
- Workflow result files
```

- [ ] **Step 5: Add smoke test script**

Create `scripts/smoke-test-plugin.ps1`:

```powershell
$ErrorActionPreference = "Stop"

npm test
npm run typecheck
npm --workspace pbg-academy-gateway run build
.\scripts\install-plugin.ps1

Write-Host "Smoke checks passed. Open Obsidian test vault for manual plugin verification."
```

- [ ] **Step 6: Update README**

Add:

```md
## Local POC Workflow

1. Run `npm install`.
2. Run `npm test`.
3. Start the gateway API with `npm --workspace @pbg/gateway-api run dev`.
4. Build the plugin with `npm --workspace pbg-academy-gateway run build`.
5. Install the plugin with `.\scripts\install-plugin.ps1`.
6. Open `E:\Obsidian\PBG Plug in` in Obsidian and enable PBG Academy Gateway.
```

- [ ] **Step 7: Run full smoke check**

Run:

```powershell
.\scripts\smoke-test-plugin.ps1
```

Expected: tests pass, typecheck passes, plugin builds, files install to the test vault.

- [ ] **Step 8: Commit hardening**

```powershell
git add packages/obsidian-plugin scripts README.md package.json package-lock.json
git commit -m "feat: harden local PBG dashboard POC"
```

**Gate:** The POC is usable from a clean repo checkout and clear README instructions.

## Build Phase Summary

```text
Phase 0: Repository Foundation
Phase 1: pbg_obsidian Database Migration
Phase 2: Shared API Contracts
Phase 3: Gateway API Skeleton
Phase 4: Obsidian Plugin Shell And Onboarding
Phase 5: Plugin API Client And Course Sync
Phase 6: Login, Sessions, And Device Registration
Phase 7: Assignment Coach Explicit Workflow
Phase 8: Dashboard Metrics And POC Hardening
```

## Final POC Acceptance Criteria

- GitHub repo contains all source, migrations, docs, and scripts.
- `pbg_obsidian` schema applies after `academy_core`.
- One active device per student is enforced.
- Obsidian plugin installs into the test vault.
- Plugin opens a PBG Academy dashboard.
- Plugin creates the PBG vault folder structure.
- Gateway API serves a course manifest.
- Plugin writes course files locally under `PBG/`.
- Assignment Coach sends note content only after explicit command.
- Workflow result markdown is saved locally.
- Server stores workflow metadata only, not full vault content.
- Full smoke script passes.

## Implementation Notes

- Keep every phase on its own commit.
- Do not add production provider connector storage in this POC.
- Do not add cross-device sync in this POC.
- Do not upload whole vault contents.
- Any real VPS deployment should happen after the local POC gates pass.
