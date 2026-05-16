export interface DiscussionStatusPayload {
  label: string;
  href: string;
  unreadCount: number;
}

export interface DiscussionSeenResponse {
  ok: true;
  unreadCount: number;
}

export interface DiscussionStatusState {
  label: string;
  href: string | null;
  unreadCount: number;
  seenPending: boolean;
}

const DEFAULT_DISCUSSION_LABEL = "PBG Discussion";

export function createDiscussionStatusState(): DiscussionStatusState {
  return {
    label: DEFAULT_DISCUSSION_LABEL,
    href: null,
    unreadCount: 0,
    seenPending: false
  };
}

export function getDiscussionBadgeLabel(unreadCount: number): string | null {
  if (unreadCount <= 0) {
    return null;
  }

  return unreadCount > 9 ? "9+" : String(unreadCount);
}

export function mergeDiscussionStatus(
  previous: DiscussionStatusState,
  payload: DiscussionStatusPayload
): DiscussionStatusState {
  const nextUnreadCount = Math.max(0, payload.unreadCount);

  return {
    label: payload.label.trim() || previous.label,
    href: toSafeWebHref(payload.href),
    unreadCount: previous.seenPending && nextUnreadCount > 0 ? 0 : nextUnreadCount,
    seenPending: previous.seenPending && nextUnreadCount > 0
  };
}

export function markDiscussionSeenOptimistically(previous: DiscussionStatusState): DiscussionStatusState {
  return {
    ...previous,
    unreadCount: 0,
    seenPending: true
  };
}

export function confirmDiscussionSeen(
  previous: DiscussionStatusState,
  response: DiscussionSeenResponse
): DiscussionStatusState {
  return {
    ...previous,
    unreadCount: Math.max(0, response.unreadCount),
    seenPending: false
  };
}

export function clearDiscussionSeenPending(previous: DiscussionStatusState): DiscussionStatusState {
  return {
    ...previous,
    seenPending: false
  };
}

function toSafeWebHref(href: string): string | null {
  try {
    const url = new URL(href);
    if (url.protocol === "http:" || url.protocol === "https:") {
      return url.toString();
    }
  } catch {
    return null;
  }

  return null;
}
