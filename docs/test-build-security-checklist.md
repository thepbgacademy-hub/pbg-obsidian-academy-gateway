# Test Build Security Checklist

This POC is approved only for private local testing until the launch gates below are cleared.

## Allowed for Private Local POC

- Run the gateway on `localhost` or another private LAN-only test host.
- Use seeded/local POC credentials only with non-sensitive vault content.
- Install the Obsidian plugin into a dedicated PBG test vault.
- Use placeholder `.env.example` values as a template, then keep real `.env` files untracked.
- Share screenshots or logs only after removing tokens, URLs with secrets, and private note content.

## Blocks VPS or Public Launch

- No public/VPS deployment while seeded credentials, stub auth, or placeholder workflow responses remain.
- No public/VPS deployment without production secrets, TLS, strict allowed origins, and secret rotation.
- No public/VPS deployment until database migrations, RLS policies, and tenant/student isolation are verified against production-like data.
- No public/VPS deployment until subscription, credit checks, device registration, refresh/logout, and workflow authorization are backed by real services.
- No public/VPS deployment until dependency audit findings and security review items are triaged or explicitly accepted.

## Pre-Launch Gate

Before any VPS/public launch, rerun `npm test`, `npm run typecheck`, a production build, secret scanning, dependency audit triage, and a manual end-to-end auth/workflow smoke test against production-like infrastructure.
