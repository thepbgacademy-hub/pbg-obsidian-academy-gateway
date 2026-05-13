# Security Audit Report

**Project:** pbg-obsidian-academy-gateway  
**Date:** 2026-05-12  
**Auditor:** Codex Security Scanner  
**Framework:** OWASP Top 10:2025  
**Scope:** `packages/`, `migrations/`, `scripts/`, root manifests, existing `audit/2026-05-12/secret-scan-report.md`  
**Technology Stack:** TypeScript, Node.js, Fastify, Obsidian plugin API, esbuild, Vitest, Postgres/Supabase SQL

---

## Executive Summary

This audit reviewed the current POC implementation of the PBG Academy Obsidian Gateway against OWASP Top 10:2025 and incorporated the dedicated secret exposure scan. The codebase is structurally appropriate for a local POC, but it is not ready for VPS exposure or production academy traffic without replacing the seeded auth path, enforcing device/session state, and addressing dependency advisories.

The highest-risk items are deployment blockers: deterministic POC credentials and bearer tokens, public network binding by default, vulnerable transitive Fastify URL parsing dependencies, and missing server-side enforcement for one-device and credit/entitlement checks. These are understandable for a POC branch, but they need explicit remediation before the gateway becomes a real subscription enforcement boundary.

**Overall Risk Score:** 57 (High Risk)

| Severity | Count |
|----------|-------|
| Critical | 0 |
| High | 3 |
| Medium | 8 |
| Low | 2 |
| Info | 2 |
| **Total** | **15** |

---

## Findings

### A01:2025 - Broken Access Control

#### MEDIUM Device registration accepts caller-supplied student identity without authentication
- **File:** `packages/gateway-api/src/app.ts`
- **Line(s):** 144-156
- **CWE:** CWE-862: Missing Authorization
- **Description:** The device registration route is public and trusts `request.body.studentId`. In production, a caller could register or probe device state for another student unless this route is bound to the authenticated academy account and server-side device records.
- **Evidence:**
  ```typescript
  app.post<{ Body: DeviceRegisterRequest }>(API_ROUTES.deviceRegister, async (request) => ({
    device: {
      deviceId: "poc-active-device",
      studentId: request.body.studentId,
      vaultId: request.body.vaultId,
      deviceFingerprint: request.body.deviceFingerprint,
      pluginVersion: request.body.pluginVersion,
      status: "active"
    },
    oneActiveDevice: {
      enforced: false,
      semantics: "poc-stub"
    }
  }));
  ```
- **Recommendation:**
  ```typescript
  app.post<{ Body: DeviceRegisterRequest }>(
    API_ROUTES.deviceRegister,
    { preHandler: requireAuth },
    async (request) => {
      const studentId = request.auth.studentId; // derived from token, never request body
      return deviceService.registerOneActiveDevice({
        studentId,
        vaultId: request.body.vaultId,
        deviceFingerprint: request.body.deviceFingerprint,
        pluginVersion: request.body.pluginVersion
      });
    }
  );
  ```

---

### A02:2025 - Security Misconfiguration

#### HIGH API listens on all interfaces while POC auth is enabled
- **File:** `packages/gateway-api/src/server.ts`
- **Line(s):** 3-4
- **CWE:** CWE-16: Configuration
- **Description:** The server defaults to `0.0.0.0`, which exposes the POC Fastify API on every network interface. Because the current auth path uses deterministic POC credentials and tokens, this default is unsafe if run on a VPS or a developer machine connected to untrusted networks.
- **Evidence:**
  ```typescript
  const port = Number(process.env.PORT ?? "8787");
  const host = process.env.HOST ?? "0.0.0.0";
  ```
- **Recommendation:**
  ```typescript
  const port = Number(process.env.PORT ?? "8787");
  const host = process.env.HOST ?? "127.0.0.1";
  if (process.env.NODE_ENV === "production" && !process.env.AUTH_PROVIDER) {
    throw new Error("Production auth provider is required before network binding");
  }
  ```

#### LOW Inline sourcemaps are bundled into the Obsidian plugin
- **File:** `packages/obsidian-plugin/esbuild.config.mjs`
- **Line(s):** 3-10
- **CWE:** CWE-200: Exposure of Sensitive Information to an Unauthorized Actor
- **Description:** Inline sourcemaps are useful during local debugging, but production plugin builds should avoid shipping full source maps if the bundle ever includes implementation details, internal route names, or future security-sensitive logic.
- **Evidence:**
  ```javascript
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
- **Recommendation:**
  ```javascript
  const isProduction = process.env.NODE_ENV === "production";
  await esbuild.build({
    entryPoints: ["src/main.ts"],
    bundle: true,
    external: ["obsidian"],
    format: "cjs",
    target: "es2018",
    outfile: "dist/main.js",
    sourcemap: isProduction ? false : "inline"
  });
  ```

---

### A03:2025 - Software Supply Chain Failures

#### HIGH Fastify dependency tree includes vulnerable `fast-uri`
- **File:** `package-lock.json`
- **Line(s):** 1341-1365
- **CWE:** CWE-22: Improper Limitation of a Pathname to a Restricted Directory
- **Description:** `npm audit --audit-level=moderate` reports high-severity advisories for `fast-uri <=3.1.1`, including path traversal via percent-encoded dot segments and host confusion via encoded authority delimiters. The vulnerable package is pulled through Fastify's schema/serialization toolchain.
- **Evidence:**
  ```json
  "node_modules/fast-uri": {
    "version": "2.4.0",
    "resolved": "https://registry.npmjs.org/fast-uri/-/fast-uri-2.4.0.tgz"
  },
  "node_modules/fastify": {
    "version": "4.29.1",
    "dependencies": {
      "@fastify/ajv-compiler": "^3.5.0",
      "@fastify/fast-json-stringify-compiler": "^4.3.0"
    }
  }
  ```
- **Recommendation:**
  ```powershell
  npm install fastify@^5.8.5
  npm test
  npm run typecheck
  npm run build
  ```
  If Fastify 5 migration is deferred, add a release gate that blocks VPS deployment while `npm audit --audit-level=high` fails.

#### MEDIUM Dev tooling includes vulnerable `esbuild` and `vite` chain
- **File:** `package-lock.json`, `package.json`, `packages/obsidian-plugin/package.json`
- **Line(s):** `package-lock.json` 1223-1226, 2511-2524; `package.json` 15-19; `packages/obsidian-plugin/package.json` 9-11
- **CWE:** CWE-1395: Dependency on Vulnerable Third-Party Component
- **Description:** `npm audit` reports `esbuild <=0.24.2` and a `vite`/`vitest` dependency chain affected by a moderate development-server exposure advisory. This is lower risk than a production runtime issue, but it matters for local development and CI environments.
- **Evidence:**
  ```json
  "devDependencies": {
    "vitest": "^2.0.5"
  }
  ```
  ```json
  "devDependencies": {
    "esbuild": "^0.23.0"
  }
  ```
- **Recommendation:**
  ```powershell
  npm install -D vitest@latest esbuild@latest
  npm test
  npm run typecheck
  npm run build
  ```

---

### A04:2025 - Cryptographic Failures

#### MEDIUM Plugin settings allow bearer and refresh tokens to be stored in local plaintext
- **File:** `packages/obsidian-plugin/src/settings.ts`, `packages/obsidian-plugin/src/main.ts`
- **Line(s):** `settings.ts` 1-5, 28-33; `main.ts` 138-143
- **CWE:** CWE-312: Cleartext Storage of Sensitive Information
- **Description:** The settings model includes `accessToken` and `refreshToken`, and Obsidian plugin data is saved through `saveData`. If production refresh tokens are persisted here, a copied vault or local file access could reuse the academy session.
- **Evidence:**
  ```typescript
  export interface PbgAcademyGatewaySettings {
    gatewayBaseUrl: string;
    accessToken?: string;
    refreshToken?: string;
  }
  ```
  ```typescript
  async saveSettings(): Promise<void> {
    await this.saveData(this.settings);
  }
  ```
- **Recommendation:**
  ```typescript
  export interface PbgAcademyGatewaySettings {
    gatewayBaseUrl: string;
    deviceId?: string;
  }
  ```
  Store only a non-secret device identifier locally where practical. If a refresh token must be local, make it device-bound, short-lived, rotating, revocable, and scoped to one vault/device.

---

### A05:2025 - Injection

No injection issues identified. Checked: path normalization in `packages/gateway-api/src/app.ts` 280-308 and `packages/obsidian-plugin/src/workflowActions.ts` 45-59, URL encoding in `packages/obsidian-plugin/src/apiClient.ts` 80-82, absence of SQL string construction in source, and absence of `eval`, `new Function`, shell execution, or dynamic code loading from user input.

---

### A06:2025 - Insecure Design

#### MEDIUM No rate limiting on login, refresh, or workflow actions
- **File:** `packages/gateway-api/src/app.ts`
- **Line(s):** 113-138, 179-244
- **CWE:** CWE-799: Improper Control of Interaction Frequency
- **Description:** Authentication and workflow routes have no per-account, per-device, or per-IP throttling. Once connected to real academy credentials and paid workflow credits, this allows brute-force attempts and accidental or malicious workflow-spend spikes.
- **Evidence:**
  ```typescript
  app.post<{ Body: LoginRequest }>(API_ROUTES.authLogin, async (request, reply) => {
    const result = await authService.login(request.body);
  });
  ```
  ```typescript
  app.post<{ Body: AssignmentCoachRunRequest }>(
    API_ROUTES.assignmentCoachRun,
    { preHandler: requireAuth },
    async (request, reply) => { /* runs workflow */ }
  );
  ```
- **Recommendation:**
  ```typescript
  await app.register(rateLimit, {
    max: 10,
    timeWindow: "1 minute",
    keyGenerator: (request) => `${request.ip}:${request.routeOptions.url}`
  });
  ```
  Add stricter account/device limits for login failures and workflow runs, backed by Redis/BullMQ if the VPS runs multiple processes.

#### MEDIUM Credit and subscription enforcement is represented but not enforced
- **File:** `packages/gateway-api/src/app.ts`
- **Line(s):** 159-175, 221-242
- **CWE:** CWE-841: Improper Enforcement of Behavioral Workflow
- **Description:** Dashboard and workflow responses include `standingGood`, `creditBalance`, and `creditCost`, but workflow execution does not check standing, entitlement, device status, or available academy credits before returning a completed run.
- **Evidence:**
  ```typescript
  standingGood: true,
  creditBalance: 250
  ```
  ```typescript
  return {
    runId: POC_ASSIGNMENT_COACH_RUN_ID,
    status: "completed",
    creditCost: 1,
    result: { /* ... */ }
  };
  ```
- **Recommendation:**
  ```typescript
  await entitlementService.assertWorkflowAllowed({
    studentId: request.auth.studentId,
    workflowSlug: "assignment-coach",
    creditCost: 1
  });
  const run = await workflowService.runAndDebitCredits(/* atomic transaction */);
  return run;
  ```

---

### A07:2025 - Authentication Failures

#### HIGH Hard-coded POC credentials and deterministic bearer tokens protect authenticated routes
- **File:** `packages/gateway-api/src/app.ts`
- **Line(s):** 12-16, 62-85, 94-103, 126-137
- **CWE:** CWE-798: Use of Hard-coded Credentials
- **Description:** The seeded auth service accepts a fixed username/password and returns deterministic access and refresh tokens. Protected routes check membership in an in-memory set that starts with the known access token. This is acceptable only for local POC testing and must be removed before any shared or VPS deployment.
- **Evidence:**
  ```typescript
  const POC_USERNAME = "pbg_test_student";
  const POC_PASSWORD = "pbg-test-password";
  export const POC_REFRESH_TOKEN = "poc-refresh-token";
  const POC_ACCESS_TOKEN = "short-lived-token";
  ```
  ```typescript
  const validAccessTokens = new Set([POC_ACCESS_TOKEN]);
  return validAccessTokens.has(authorization.slice("Bearer ".length));
  ```
- **Recommendation:**
  ```typescript
  const result = await academyAuth.authenticatePassword({
    username: request.body.username,
    password: request.body.password
  });
  const accessToken = jwt.sign(
    { sub: result.studentId, deviceId: device.id },
    env.ACCESS_TOKEN_SECRET,
    { expiresIn: "15m", audience: "pbg-obsidian", issuer: "pbg-academy" }
  );
  const refreshToken = createOpaqueToken();
  await sessionStore.saveHash(hashToken(refreshToken), { studentId: result.studentId, deviceId: device.id });
  ```

#### MEDIUM Logout does not invalidate tokens or sessions
- **File:** `packages/gateway-api/src/app.ts`
- **Line(s):** 140-142
- **CWE:** CWE-613: Insufficient Session Expiration
- **Description:** Logout always returns `ok: true` and does not remove access tokens from the in-memory set, revoke refresh token hashes, or mark sessions as revoked.
- **Evidence:**
  ```typescript
  app.post(API_ROUTES.authLogout, async () => ({
    ok: true
  }));
  ```
- **Recommendation:**
  ```typescript
  app.post(API_ROUTES.authLogout, { preHandler: requireAuth }, async (request) => {
    await sessionStore.revokeDeviceSession(request.auth.sessionId);
    return { ok: true };
  });
  ```

---

### A08:2025 - Software or Data Integrity Failures

No code execution or unsafe deserialization issues identified. Checked: no `eval`, no `new Function`, no `Object.assign(request.body)`/spread mass assignment patterns, no external browser scripts, no auto-update downloader, package-lock integrity hashes are present, and Obsidian result filenames are constrained by `SAFE_RESULT_FILENAME_PATTERN` in `packages/obsidian-plugin/src/workflowActions.ts` 6-8 and 142-158.

---

### A09:2025 - Security Logging and Alerting Failures

#### MEDIUM Security-relevant gateway events are not logged
- **File:** `packages/gateway-api/src/app.ts`
- **Line(s):** 89-92, 105-130
- **CWE:** CWE-778: Insufficient Logging
- **Description:** Fastify logging is disabled, and failed auth, invalid bearer tokens, refresh failures, and authorization denials are returned without structured audit events. The project has an `academy_core.audit_events` concept, but the POC gateway does not write to it yet.
- **Evidence:**
  ```typescript
  const app = Fastify({
    logger: false
  });
  ```
  ```typescript
  return reply.code(401).send({
    error: "Invalid refresh token"
  });
  ```
- **Recommendation:**
  ```typescript
  const app = Fastify({ logger: true });
  await auditLog.record({
    eventType: "obsidian.auth_failed",
    actorStudentId: null,
    ip: request.ip,
    route: request.routeOptions.url
  });
  ```
  Log security events without raw passwords, bearer tokens, vault contents, or full note bodies.

---

### A10:2025 - Mishandling of Exceptional Conditions

#### MEDIUM Runtime request validation is missing before nested body access
- **File:** `packages/gateway-api/src/app.ts`
- **Line(s):** 113-114, 179-203, 208-240
- **CWE:** CWE-754: Improper Check for Unusual or Exceptional Conditions
- **Description:** TypeScript route generics document expected shapes, but Fastify does not receive runtime JSON schemas for request bodies. Authenticated malformed requests can trigger exceptions by omitting `assignmentPath`, `relatedContext`, or `localMetadata`, creating avoidable 500s and noisy operational behavior.
- **Evidence:**
  ```typescript
  const scopeError = getAssignmentScopeError(request.body.assignmentPath);
  const contextCount = request.body.relatedContext.length;
  const taskCount = request.body.localMetadata.taskCount;
  ```
- **Recommendation:**
  ```typescript
  app.post(
    API_ROUTES.assignmentCoachRun,
    {
      preHandler: requireAuth,
      schema: {
        body: {
          type: "object",
          required: ["assignmentPath", "assignmentTitle", "assignmentBody", "relatedContext", "localMetadata"],
          additionalProperties: false,
          properties: {
            assignmentPath: { type: "string", minLength: 1, maxLength: 512 },
            assignmentTitle: { type: "string", minLength: 1, maxLength: 200 },
            assignmentBody: { type: "string", maxLength: 200000 },
            relatedContext: { type: "array", maxItems: 20 },
            localMetadata: { type: "object" }
          }
        }
      }
    },
    handler
  );
  ```

---

## Risk Score Breakdown

Scoring: Critical = 10 pts, High = 7 pts, Medium = 4 pts, Low = 2 pts, Info = 0 pts.

| Category | Critical | High | Medium | Low | Info | Points |
|----------|----------|------|--------|-----|------|--------|
| A01 - Broken Access Control | 0 | 0 | 1 | 0 | 0 | 4 |
| A02 - Security Misconfiguration | 0 | 1 | 0 | 1 | 0 | 9 |
| A03 - Supply Chain Failures | 0 | 1 | 1 | 0 | 0 | 11 |
| A04 - Cryptographic Failures | 0 | 0 | 1 | 0 | 0 | 4 |
| A05 - Injection | 0 | 0 | 0 | 0 | 0 | 0 |
| A06 - Insecure Design | 0 | 0 | 2 | 0 | 0 | 8 |
| A07 - Authentication Failures | 0 | 1 | 1 | 0 | 0 | 11 |
| A08 - Data Integrity Failures | 0 | 0 | 0 | 0 | 0 | 0 |
| A09 - Logging & Alerting Failures | 0 | 0 | 1 | 0 | 0 | 4 |
| A10 - Exceptional Conditions | 0 | 0 | 1 | 0 | 0 | 4 |
| Secret Exposure Scan | 0 | 0 | 0 | 1 | 2 | 2 |
| **Total** | **0** | **3** | **8** | **2** | **2** | **57** |

**Risk Rating:** 0-10 = Low | 11-30 = Moderate | 31-60 = High | 61+ = Critical

Note: the executive count treats the secret-scan Low finding as overlapping with A07 because it is the same POC credential issue. The detailed risk table shows both the OWASP classification and the dedicated secret-scan classification for traceability.

---

## Remediation Priority

1. **Replace POC auth before VPS exposure** - Remove hard-coded credentials/tokens, derive student identity from academy_core auth, issue expiring signed access tokens, store only hashed refresh tokens, and revoke sessions on logout.
2. **Close the network/deployment gap** - Default local binding to `127.0.0.1`, add a production startup guard, and block deployment unless real auth, rate limits, and audit logging are enabled.
3. **Upgrade vulnerable dependencies** - Move Fastify to a non-vulnerable dependency tree, then update Vitest/esbuild and make `npm audit --audit-level=high` a release gate.
4. **Enforce paid workflow controls server-side** - Check standing, device status, entitlements, and academy credits immediately before queueing or running any workflow.
5. **Add runtime schemas and security logs** - Validate all JSON bodies and record auth/access-control/workflow-spend events without storing vault bodies or secrets.

---

## Test Build vs Public Launch Risk Acceptance

This appendix was added after an independent read-only review of this report from the GitHub-backed branch `codex/pbg-obsidian-poc` at commit `ee68502501e57b56d1d02779708142b85da9543e`. The reviewer's conclusion matches the primary audit: several findings are tolerable only while the project remains a private, local POC using fake data and non-public networking. Those same findings become launch blockers once the gateway is reachable from a VPS, handles real student accounts, stores real sessions, enforces paid credits, or ships a distributed plugin bundle.

### Current Private Test Build

The following risks are acceptable for the current test build only under all of these conditions:

- The gateway is used by trusted builders only.
- The API remains local or explicitly firewalled from public access.
- The POC credentials and deterministic tokens are treated as fake fixtures.
- No real OpenAI, Stripe, Supabase service-role, Telegram, database, or provider secrets are committed.
- Workflow results remain mocked or deterministic and are not used to enforce real billing.
- No real student privacy, payment, subscription, or vault-content obligations are delegated to this POC code.

### Risk Classification Matrix

| Finding/category | Tolerable during private test build? | Required before public launch | Rationale |
|---|---|---|---|
| Hard-coded POC credentials and deterministic bearer/refresh tokens | Yes, only for private localhost POC | Replace with academy auth, expiring signed access tokens, hashed refresh tokens, and server-side revocation | This is the main launch blocker; exposed literals would grant access to protected routes. |
| API defaults to `0.0.0.0` | No for VPS/shared networks; yes only if manually kept local/firewalled | Default to `127.0.0.1`, add production startup guard, and require real auth before external bind | POC auth plus all-interface binding turns test code into a reachable weak-auth service. |
| Fastify dependency tree vulnerable via `fast-uri` | Yes, for local-only POC with no public traffic | Upgrade Fastify/dependency tree and block release while high-severity audit fails | High-severity runtime dependency issues belong in the launch gate even when current exploitability is contextual. |
| Device registration trusts caller-supplied `studentId` | Yes, for mocked POC flows | Require auth and derive student identity server-side | Public launch needs device identity bound to the authenticated academy account. |
| Credit/subscription/entitlement checks are represented but not enforced | Yes, for demo responses only | Enforce standing, entitlement, device state, and credits atomically before workflow execution | The gateway is intended to be a subscription and academy-credit boundary; mock enforcement cannot remain. |
| Plaintext token storage in Obsidian plugin settings | Yes, for fake POC tokens | Avoid storing secrets where practical; otherwise use short-lived, rotating, device-bound, revocable tokens | Local vault/plugin data can be copied, so production refresh tokens need stronger handling. |
| No rate limiting on login, refresh, or workflows | Yes, in isolated local testing | Add per-IP, per-account, and per-device limits, especially around login and paid workflows | Rate limits reduce brute force risk and academy-credit/spend abuse. |
| Logout does not revoke sessions | Yes, with fake in-memory POC tokens | Revoke server-side session and refresh token state on logout | Public users expect logout to terminate access. |
| Missing runtime JSON schemas | Yes, with controlled POC clients | Add Fastify schemas for auth, workflow, and device request bodies | Runtime validation prevents avoidable 500s and malformed-input abuse. |
| Missing security audit logging | Yes, for local dev | Log auth failures, token failures, authorization denials, device events, and workflow-spend events without secrets or vault bodies | Audit logs are required for incident response, fraud detection, and operational accountability. |
| Dev tooling vulnerabilities in `esbuild`/`vite`/`vitest` | Yes, for trusted local dev networks | Upgrade before public repo/release CI hardening | Lower risk than runtime Fastify issues, but still should not persist into release process. |
| Inline sourcemaps in plugin bundle | Yes, for debug builds | Disable for production builds | Production plugin artifacts should avoid exposing source and implementation details. |
| No live provider secrets found | Yes | Keep CI/pre-commit secret scanning and add `.env.example`; keep real secrets out of git | This is a positive result, but production secret management still needs to be defined. |

### Public Launch Gates

These gates must pass before a public product launch or public VPS deployment:

1. **Production authentication and sessions:** remove all POC credentials/tokens, authenticate against the academy account system, issue expiring access tokens, store only hashed refresh tokens server-side, and revoke sessions on logout/password/device changes.
2. **Safe exposure controls:** default to localhost, require explicit production configuration for public binding, and refuse startup when real auth, rate limits, and audit logging are not configured.
3. **Subscription, credit, and device enforcement:** enforce good standing, workflow entitlements, available academy credits, and one-active-device rules before queueing or running workflows.
4. **Dependency and release security gate:** clear high-severity dependency advisories, especially the Fastify/`fast-uri` chain, and make `npm audit --audit-level=high` a release blocker.
5. **Validation and observability:** add runtime request schemas plus structured security/audit logging for auth, access control, device registration, and workflow-spend events while excluding passwords, bearer tokens, provider keys, and raw vault bodies.

### Codex Analysis

For the current phase, the team can keep moving with the POC as long as it stays private and local. The most important immediate adjustment is procedural: nobody should run this gateway publicly on the VPS until the production-auth gate and safe-exposure gate are done. The moment real students, real subscription status, real credits, or real provider connectors enter the system, the tolerable-risk column collapses and the public-launch requirements become mandatory engineering work.

The clean boundary remains the same: the plugin may read the user's designated PBG vault content locally and send only workflow-specific context after a user action, while the server stores minimal metadata for sessions, devices, workflow runs, credit debits, and audit events. This model is compatible with launch, but only after enforcement and logging move from documented intent into server-side code.

---

## Secret Exposure Scan

Dedicated report: `audit/2026-05-12/secret-scan-report.md`

No exposed live provider secrets were identified in the scanned scope. The only Low finding was the known POC username/password and deterministic token fixtures. Those values are fake test credentials, but they must not ship into production gateway code.

| Severity | Count |
|----------|-------|
| Critical | 0 |
| High | 0 |
| Medium | 0 |
| Low | 1 |
| Info | 2 |
| **Total** | **3** |

### Checked Surfaces

- Environment files: checked, none present.
- Source/config files: checked.
- Docker/deployment files: checked where present, no Docker deployment files in this repo.
- CI/CD files: checked, no `.github` workflow directory present.
- Logs/fixtures/docs: checked.
- Git history: checked with provider-shaped patterns and broad credential keywords.

### Secret Findings

#### LOW POC credentials and tokens are hard-coded in source and tests
- **File:** `packages/gateway-api/src/app.ts`
- **Line(s):** 13-16
- **Provider/type:** POC username/password and bearer/refresh token fixtures
- **Masked evidence:** `pbg_test_student` / `pbg-test-...`, `short-lived-...`, `poc-refresh-...`
- **Impact:** Not a live provider secret, but deterministic values would grant access to protected routes if the POC API is exposed.
- **Rotation/removal guidance:** No live rotation required. Remove before production, replace with real academy authentication and hashed session storage.
- **History cleanup:** Not required because no live secret was found.
- **Prevention control:** Add CI secret scanning and a release checklist that blocks `POC_*` auth literals in production server code.

#### INFO No provider-shaped secrets found
The scan found no current-tree or history matches for live-looking OpenAI, Stripe, Supabase service-role, GitHub, AWS, Google, Slack, Telegram, SendGrid, Twilio, Discord, Cloudflare, Sentry, Vercel, private-key, or password-bearing database URL secrets.

#### INFO Secret management is not yet defined
No `.env` or environment template exists. That is acceptable for this local POC, but production integration should add `.env.example`, ignore real `.env*` files, and keep production secrets in VPS environment/secret storage.

---

## Methodology

This audit was performed using static analysis against the OWASP Top 10:2025 framework plus a dedicated secret exposure scan. Each OWASP category was evaluated using pattern matching, code review, dependency analysis, and configuration inspection. Secret scanning covered provider-shaped keys, credential variable names, private key material, connection strings, sensitive config files, and git history where available. The analysis covered source code, configuration files, dependency manifests, environment settings, deployment files, scripts, migrations, and selected audit-relevant artifacts.

Commands included targeted `rg` searches, line-numbered source review, `npm audit --audit-level=moderate`, package-lock inspection, git status/head checks, and review of the prior `secret-scanner` report.

**Limitations:** This is a static analysis. It does not include dynamic/runtime testing, penetration testing, VPS network inspection, Supabase policy testing, or live Obsidian UI testing. Some vulnerabilities may only be discoverable through dynamic testing.

## References

- OWASP Top 10:2025 references bundled with the `security-scanner` skill
- OWASP Application Security Verification Standard
- OWASP Cheat Sheet Series
- Existing secret scan: `audit/2026-05-12/secret-scan-report.md`
