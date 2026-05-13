# Secret Exposure Scan

## Scope

- Repository: `C:\tmp\pbg-obsidian-academy-gateway-work`
- Branch: `codex/pbg-obsidian-poc`
- Commit scanned: `da3ae841b42072285937ba470694a5c8216f33c1`
- Date: 2026-05-12

Excluded from routine current-tree scans: `.git`, `node_modules`, `dist`, `build`, `.next`, and coverage/cache-style output.

Included surfaces: source, tests, docs, scripts, migrations, package manifests/lockfile, JSON/YAML/config-like files, and git history.

## Methodology

- Inventoried likely secret surfaces with `rg --files`.
- Scanned current tree for credential keywords.
- Scanned current tree for provider-shaped credentials and private key blocks.
- Scanned git history with targeted `git log -G` provider patterns.
- Scanned git history with broad credential keywords using `git grep` over all commits.
- Reviewed hits manually to separate placeholders/test fixtures from likely exposed credentials.

## Severity Counts

- Critical: 0
- High: 0
- Medium: 0
- Low: 1
- Info: 2

## Findings

### Low: POC Credentials And Tokens Are Hard-Coded In Source And Tests

**Status:** Confirmed placeholder/test fixture, not a live provider secret.

**Evidence:**

- `packages/gateway-api/src/app.ts` contains seeded POC values:
  - username/password fixture: `pbg_test_student` / `pbg-test-password`
  - access token fixture: `short-lived-token`
  - refresh token fixture: `poc-refresh-token`
- Multiple tests and docs intentionally reference the same POC literals.

**Rationale:**

These values are not provider-shaped, are short, human-readable, and are repeatedly documented as POC/test credentials. They do not look like live OpenAI, Stripe, Supabase, GitHub, cloud, webhook, database, or private-key material.

**Risk:**

Low for the current POC branch, but these literals must not graduate into production auth. If deployed beyond a local POC, deterministic tokens would allow unauthorized access to protected routes.

**Recommendation:**

- Before VPS deployment, replace POC auth with real password verification, short-lived signed access tokens, hashed refresh tokens, and server-side session/device records.
- Keep test credentials obviously fake.
- Add a release checklist item that blocks deployment while `POC_PASSWORD`, `POC_ACCESS_TOKEN`, or `POC_REFRESH_TOKEN` remain in production server code.

### Info: No Provider-Shaped Secrets Found

**Status:** No exposed secrets identified in scanned scope.

The scan found no current-tree or history matches for live-looking:

- OpenAI API keys
- Stripe secret/restricted/webhook keys
- Supabase service-role keys
- GitHub tokens
- AWS access keys
- Google private keys/service-account private key blocks
- Slack, Telegram, SendGrid, Twilio, Discord, Cloudflare, Sentry, or Vercel tokens
- PEM private key blocks
- Database URLs containing passwords

Package-lock integrity hashes and deterministic SHA-256 test fixtures were reviewed as non-secret hashes.

### Info: Environment And Secret Management Is Not Yet Defined

**Status:** Hygiene recommendation.

No `.env` or environment templates are present. That is acceptable for the local POC, but the next deployment phase will need explicit secret handling.

**Recommendation:**

- Add `.env.example` with placeholder-only values when real VPS integration starts.
- Keep `.env*` ignored except `.env.example`.
- Store production secrets in the VPS secret manager/environment, not in source.
- Add CI/pre-commit secret scanning before merging production integration work.

## Git History Review

History scans found credential keywords in docs, tests, SQL column names, and POC fixtures. Provider-shaped targeted history search produced no live secret matches. No `.env` files were found in history.

Because no confirmed live secret was found, no rotation or git history cleanup is required from this scan.

## Commands Run

```powershell
rg --files -g ".env*" -g "*.env" -g "*.pem" -g "*.key" -g "*.p12" -g "*.pfx" -g "*.json" -g "*.yml" -g "*.yaml" -g "*.toml" -g "*.ini" -g "docker-compose*" -g ".github/**" -g ".gitlab-ci.yml" -g "*.ps1" -g "*.md" --hidden --glob "!.git/**" --glob "!node_modules/**" --glob "!dist/**"
git rev-parse --is-inside-work-tree
rg -n -i --hidden --glob "!.git/**" --glob "!node_modules/**" --glob "!dist/**" --glob "!build/**" --glob "!.next/**" "(api[_-]?key|secret|token|password|passwd|pwd|credential|private[_-]?key|client[_-]?secret|service[_-]?role|webhook[_-]?secret|signing[_-]?secret|database[_-]?url|connection[_-]?string|bearer|authorization)"
rg -n --hidden --glob "!.git/**" --glob "!node_modules/**" --glob "!dist/**" "(sk-(?:proj-)?[A-Za-z0-9_-]{20,}|sk_live_[A-Za-z0-9]{16,}|rk_live_[A-Za-z0-9]{16,}|whsec_[A-Za-z0-9]{16,}|ghp_[A-Za-z0-9]{20,}|github_pat_[A-Za-z0-9_]{20,}|AKIA[0-9A-Z]{16}|AIza[0-9A-Za-z_-]{20,}|xox[baprs]-[A-Za-z0-9-]{10,}|SG\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}|[A-Za-z0-9_-]{24}\.[A-Za-z0-9_-]{6}\.[A-Za-z0-9_-]{27}|-----BEGIN (?:RSA |EC |OPENSSH |)?PRIVATE KEY-----|postgres(?:ql)?://[^\s:@]+:[^\s@]+@|SUPABASE_SERVICE_ROLE_KEY|TELEGRAM_BOT_TOKEN|VERCEL_TOKEN|CLOUDFLARE_API_TOKEN|SENTRY_AUTH_TOKEN)"
git log --all --stat -- .env .env.local .env.production .env.example
git log --all -G "sk_live_|rk_live_|whsec_|SUPABASE_SERVICE_ROLE_KEY|BEGIN PRIVATE KEY|ghp_|github_pat_|AKIA|postgresql://|TELEGRAM_BOT_TOKEN|OPENAI_API_KEY|STRIPE_SECRET|DATABASE_URL" --oneline
git grep -n -I -i "api_key\|secret\|token\|password\|private_key\|service_role\|database_url\|connection_string\|webhook" $(git rev-list --all) -- . ':(exclude)package-lock.json'
rg -n --hidden --glob "!.git/**" --glob "!node_modules/**" --glob "!dist/**" "[A-Za-z0-9+/]{40,}={0,2}|[A-Fa-f0-9]{64}"
rg -n --hidden --glob "!.git/**" --glob "!node_modules/**" --glob "!dist/**" "pbg-test-password|short-lived-token|poc-refresh-token|access-token|refresh-token|device-refresh-token"
```

## Result

No exposed live secrets identified in the scanned scope.
