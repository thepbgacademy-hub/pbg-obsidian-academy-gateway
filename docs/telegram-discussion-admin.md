# Telegram Discussion Admin Notes

## Purpose

This note captures the live academy Telegram discussion integration that powers the `PBG Discussion` badge in the Obsidian dashboard.

## Live Telegram Group

- Label: `PBG Discussion`
- Current Telegram chat title: `PBG General Discussion`
- Invite link: `https://t.me/+Xpdv7ztBFFc1MGVh`
- Locked Telegram group ID: `-1002059446209`

## Active n8n Workflow

- Workflow name: `PBG Discussion Counter`
- Active workflow ID: `EouBB9bYZCd146oC`

## Polling Model

- Telegram polling cadence: every `30 minutes`
- Reason: reduce Telegram/API churn while keeping the classroom signal timely enough for dashboard use
- Production shape:
  - n8n polls Telegram on schedule
  - n8n caches the latest activity sequence and per-student seen markers
  - gateway reads cached state
  - Obsidian polls the gateway, not Telegram

## Active Webhook Paths

- Manual refresh webhook:
  - `pbg-discussion-refresh-20260516-7c2d0c5a`
- Status webhook:
  - `pbg-discussion-status-20260516-43d913b2`
- Seen webhook:
  - `pbg-discussion-seen-20260516-d1be8fd0`

## Behavior

- The dashboard left rail shows `PBG Discussion` with a numeric unread badge.
- Clicking the item opens the Telegram group link.
- Clicking also marks the discussion as seen immediately for that student.
- Unread counts are per-student, not academy-wide.

## Matcher Rule

- Primary match rule: exact Telegram `chatId` must match `-1002059446209`
- Fallback bootstrap rule: only used if the saved `chatId` is ever missing and a non-bot message arrives from a group or supergroup

## If The Group Changes

Update all of the following together:

1. Telegram invite link in the workflow static config / docs
2. Locked `chatId` in the workflow matcher
3. Any seeded or documented label/title references if they change materially
4. Verify the live status webhook returns expected unread counts after a fresh test message

## Important Files

- Workflow source:
  - `C:\tmp\pbg-obsidian-academy-gateway-work\ops\n8n\pbg-discussion-counter.workflow.json`
- Gateway remote discussion integration:
  - `C:\tmp\pbg-obsidian-academy-gateway-work\packages\gateway-api\src\app.ts`
- Discussion badge plan:
  - `C:\tmp\pbg-obsidian-academy-gateway-work\docs\superpowers\plans\2026-05-15-pbg-discussion-badge.md`
- Discussion badge spec:
  - `C:\tmp\pbg-obsidian-academy-gateway-work\docs\superpowers\specs\2026-05-15-pbg-discussion-badge-design.md`

## Verification Snapshot

Verified on `2026-05-15` / `2026-05-16`:

- live Telegram message reached n8n
- workflow matched the correct group
- unread count appeared in Obsidian
- clicking `PBG Discussion` opened Telegram
- clicking cleared the badge for the signed-in student
