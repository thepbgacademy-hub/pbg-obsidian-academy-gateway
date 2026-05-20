# Next Build Session Handoff

Date: 2026-05-19

## Branch And Repo

- Repo: `https://github.com/thepbgacademy-hub/pbg-obsidian-academy-gateway`
- Branch: `codex/pbg-obsidian-poc`
- Local repo: `C:\tmp\pbg-obsidian-academy-gateway-work`

## Current Verified State

The current branch has been pushed to GitHub and includes the latest dashboard/coach refinements.

Verified before push:
- `npm test` passed: `30/30` files, `139/139` tests
- `npm run typecheck` passed
- `npm run build` passed

Live Obsidian state verified in the PBG test vault:
- left rail label changed from `Dashboard` to `Overview`
- `PBG Discussion` button now uses Telegram icon + plain unread count
- Telegram icon presentation was fixed with CSS clipping so the square plate is no longer visible
- announcement banner label now says `Academy Announcement`
- assignment area uses real 3-column layout without fake preview cards
- full `Coach` experience lives in `Assignments`, not the main overview page

Latest pushed commit at handoff:
- `a9b261b feat: add coach workspace and dashboard refinements`

## Most Important Docs To Open First

1. `C:\tmp\pbg-obsidian-academy-gateway-work\docs\current-build-state.md`
2. `C:\tmp\pbg-obsidian-academy-gateway-work\docs\dashboard-feature-map.md`
3. `C:\tmp\pbg-obsidian-academy-gateway-work\docs\superpowers\specs\2026-05-19-telegram-admin-asset-intake-design.md`
4. `C:\tmp\pbg-obsidian-academy-gateway-work\docs\telegram-discussion-admin.md`
5. `C:\tmp\pbg-obsidian-academy-gateway-work\docs\build-error-log.md`

## Next Exact Build Step

Start the implementation plan for the new feature:
- `Telegram Admin Asset Intake -> Targeted Vault Delivery -> Dashboard Asset Cards`

Immediate first implementation target:
1. write the implementation plan for the spec:
   - `C:\tmp\pbg-obsidian-academy-gateway-work\docs\superpowers\specs\2026-05-19-telegram-admin-asset-intake-design.md`
2. define the minimum metadata model and shared contracts for:
   - asset id
   - Telegram message id
   - Telegram file id
   - asset type
   - targeting fields
   - delivery mode
   - approval state
   - delivery state
   - delivered vault path(s)
3. design the first n8n intake workflow around:
   - private admin Telegram group
   - structured caption metadata
   - `auto` vs `approval-required`
4. keep server storage lightweight and do not turn the VPS into a media warehouse
5. keep all student-facing delivery inside academy-scoped vault paths only:
   - `PBG/Courses/...`
   - `PBG/Assignments/...`
   - `PBG/Resources/...`

## Suggested Implementation Order

1. shared types/contracts for asset intake and delivery metadata
2. gateway-side asset metadata routes and POC state
3. plugin-side dashboard asset card model
4. local vault delivery helper(s)
5. n8n workflow/export for Telegram admin intake
6. live test with one document and one image

## Important Existing Files For This Next Slice

### Gateway
- `C:\tmp\pbg-obsidian-academy-gateway-work\packages\gateway-api\src\app.ts`
- `C:\tmp\pbg-obsidian-academy-gateway-work\packages\gateway-api\src\server.ts`

### Shared contracts
- `C:\tmp\pbg-obsidian-academy-gateway-work\packages\shared\src\contracts.ts`

### Plugin dashboard
- `C:\tmp\pbg-obsidian-academy-gateway-work\packages\obsidian-plugin\src\dashboardView.ts`
- `C:\tmp\pbg-obsidian-academy-gateway-work\packages\obsidian-plugin\src\dashboardShell.ts`
- `C:\tmp\pbg-obsidian-academy-gateway-work\packages\obsidian-plugin\styles.css`

### Coach-related local vault patterns to reuse
- `C:\tmp\pbg-obsidian-academy-gateway-work\packages\obsidian-plugin\src\coachStorage.ts`
- `C:\tmp\pbg-obsidian-academy-gateway-work\packages\obsidian-plugin\src\coachPanel.ts`

### Telegram discussion workflow reference
- `C:\tmp\pbg-obsidian-academy-gateway-work\ops\n8n\pbg-discussion-counter.workflow.json`

## Guardrails For The Next Session

- Do not expose Telegram mechanics to students.
- Do not build a Telegram media browser.
- Do not store full media libraries on the VPS unless absolutely necessary.
- Use Telegram as intake, the server as routing/audit metadata, and the vault as the student working copy.
- Keep delivery scoped to academy-managed folders only.
- Preserve the local-first product shape.

## Open Product Questions Still Worth Settling During Implementation

- For large audio/video assets, should MVP copy into vaults or link via a lighter delivery path?
- Should approval state live only in n8n first, or also in academy DB metadata from v1?
- Should structured caption tokens be the first admin UX, or should the first slice include a small approval/routing form immediately?

## Test Surface

- Test vault: `E:\Obsidian\PBG Plug in`
- Installed plugin path: `E:\Obsidian\PBG Plug in\.obsidian\plugins\pbg-academy-gateway`
- Local gateway URL used by plugin: `http://localhost:8788`
