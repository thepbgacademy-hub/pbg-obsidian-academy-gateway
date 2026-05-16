# PBG Discussion Badge Design

Date: 2026-05-15

## Goal

Add a lightweight `PBG Discussion` signal to the Obsidian dashboard left rail so students can see when the academy Telegram group has new activity and jump into it quickly.

The badge should:

- live in the left rail
- show a numeric unread-style count
- poll through the academy gateway
- open the Telegram group link on click
- mark the student's lounge state as seen immediately on click

This should stay a classroom signal, not a chat client.

## Approved Constraints

- Group label: `PBG Discussion`
- Group link: `https://t.me/+Xpdv7ztBFFc1MGVh`
- Badge style: numeric count
- Seen behavior: mark seen immediately on click
- No embedded Telegram iframe/webview requirement in this slice

## Recommended Approach

Use a per-student last-seen marker stored on the academy backend, with the Obsidian plugin polling a lightweight status endpoint.

This gives the right behavior:

- one student's click does not clear another student's badge
- the academy stores minimal metadata only
- the plugin does not talk to Telegram directly
- the left rail stays simple and responsive

## User Experience

### Left Rail

Add a `PBG Discussion` item to the academy left rail.

Badge behavior:

- no badge when count is `0`
- show `1` through `9`
- show `9+` when count is greater than `9`

Click behavior:

1. open the Telegram invite/group link in the user's default external browser/app path
2. immediately POST a seen marker to the gateway
3. optimistically clear the local badge

The count should feel like a student-lounge activity signal, not an intrusive alert.

### Polling

The plugin should poll on a conservative interval, similar to the announcement banner cadence.

Recommended initial interval:

- 60 seconds

This is enough for discussion awareness without becoming noisy or server-heavy.

## Architecture

### Data Flow

Correct flow:

1. Telegram group activity is observed by academy infrastructure
2. academy infrastructure stores a minimal latest-activity marker
3. gateway computes the current student's discussion count from:
   - latest group marker
   - student's last-seen marker
4. plugin polls gateway for discussion status
5. plugin renders badge in the left rail
6. click opens the link and marks seen through the gateway

The plugin must not talk directly to Telegram APIs.

### Backend Ownership

Telegram-side integration belongs to academy backend/bot infrastructure, not the plugin.

The plugin only needs:

- current discussion count
- group label
- group link
- success/failure handling for mark-seen

## Minimal Data Model

The backend should store only minimal metadata needed for this feature.

### Academy-level discussion activity

One current marker for the group, such as:

- `latest_message_timestamp`

If your Telegram pipeline already has stable message IDs conveniently available, that is also acceptable, but timestamp is the simplest first implementation.

### Per-student discussion state

Per student:

- `student_id`
- `last_seen_discussion_timestamp`

This gives per-student state without warehousing message content.

## Gateway Contracts

### 1. Discussion Status

`GET /api/lounge/discussion-status`

Response shape:

```json
{
  "label": "PBG Discussion",
  "href": "https://t.me/+Xpdv7ztBFFc1MGVh",
  "unreadCount": 3
}
```

Rules:

- authenticated route
- count is already student-specific
- count is server-computed

### 2. Mark Seen

`POST /api/lounge/discussion-seen`

Response shape:

```json
{
  "ok": true,
  "unreadCount": 0
}
```

Rules:

- authenticated route
- server updates the student's last-seen marker to the latest known group marker
- plugin may optimistically clear the badge immediately, then reconcile against response

## Plugin Changes

### Dashboard Shell

Extend the left rail model with one more item:

- `PBG Discussion`

This item differs from the existing placeholder rail items because it has:

- an external link target
- a dynamic numeric badge
- active polling-backed state

### Client State

Add a small discussion status state module, parallel to the announcement banner state, responsible for:

- current unread count
- label
- href
- optimistic clear on click

No message content should be stored in plugin state.

### Click Handling

The click sequence should be:

1. open external link
2. update local badge to zero immediately
3. fire mark-seen request
4. if request fails, allow next poll to restore the count

This keeps interaction snappy without overcomplicating error recovery.

## Error Handling

If status polling fails:

- keep last known badge state
- do not show a popup notice
- log to console only

If mark-seen fails:

- do not interrupt the user
- allow next poll to reconcile state

If the link is missing or invalid:

- render the label without a click action or fall back to a quiet disabled state

## Out of Scope

Not part of this feature:

- rendering Telegram messages inside Obsidian
- iframe/webview Telegram embedding
- thread previews
- chat reply UI
- Telegram auth/state mirroring per client
- discussion summary cards in the main workspace

Those can be explored later if needed, but they are intentionally excluded here.

## Testing Plan

Add focused tests for:

- shared route constants
- gateway status response
- gateway mark-seen response
- badge count rendering rules (`0`, `1-9`, `9+`)
- optimistic badge clear on click
- external link handling wiring
- per-student state flow in gateway tests

## Success Criteria

This feature is successful when:

1. a signed-in student sees `PBG Discussion` in the left rail
2. the rail shows a numeric badge when new group activity exists
3. clicking the item opens the Telegram group link
4. clicking immediately clears the badge for that student
5. another student's badge state is unaffected
6. the plugin stores no Telegram message content locally

## Implementation Direction

The implementation plan should cover:

1. shared lounge route constants and payload types
2. gateway lounge status + seen endpoints
3. plugin client methods
4. left rail badge state and rendering
5. click handling with optimistic clear
6. focused verification and Obsidian smoke pass
