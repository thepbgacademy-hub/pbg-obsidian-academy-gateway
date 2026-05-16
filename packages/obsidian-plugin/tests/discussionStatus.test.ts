import { describe, expect, it } from "vitest";
import {
  clearDiscussionSeenPending,
  confirmDiscussionSeen,
  createDiscussionStatusState,
  getDiscussionBadgeLabel,
  markDiscussionSeenOptimistically,
  mergeDiscussionStatus
} from "../src/discussionStatus.js";

describe("discussion badge state", () => {
  it("starts with no unread discussion activity", () => {
    expect(createDiscussionStatusState()).toEqual({
      label: "PBG Discussion",
      href: null,
      unreadCount: 0,
      seenPending: false
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
      unreadCount: 3,
      seenPending: false
    });
  });

  it("clears the badge immediately when discussion is marked seen", () => {
    expect(
      markDiscussionSeenOptimistically({
        label: "PBG Discussion",
        href: "https://t.me/+Xpdv7ztBFFc1MGVh",
        unreadCount: 5,
        seenPending: false
      })
    ).toEqual({
      label: "PBG Discussion",
      href: "https://t.me/+Xpdv7ztBFFc1MGVh",
      unreadCount: 0,
      seenPending: true
    });
  });

  it("does not resurrect a stale unread count while seen is pending", () => {
    const optimistic = markDiscussionSeenOptimistically({
      label: "PBG Discussion",
      href: "https://t.me/+Xpdv7ztBFFc1MGVh",
      unreadCount: 5,
      seenPending: false
    });

    expect(
      mergeDiscussionStatus(optimistic, {
        label: "PBG Discussion",
        href: "https://t.me/+Xpdv7ztBFFc1MGVh",
        unreadCount: 5
      })
    ).toEqual({
      label: "PBG Discussion",
      href: "https://t.me/+Xpdv7ztBFFc1MGVh",
      unreadCount: 0,
      seenPending: true
    });
  });

  it("clears pending state when the gateway confirms the seen marker", () => {
    expect(
      confirmDiscussionSeen(
        {
          label: "PBG Discussion",
          href: "https://t.me/+Xpdv7ztBFFc1MGVh",
          unreadCount: 0,
          seenPending: true
        },
        {
          ok: true,
          unreadCount: 0
        }
      )
    ).toEqual({
      label: "PBG Discussion",
      href: "https://t.me/+Xpdv7ztBFFc1MGVh",
      unreadCount: 0,
      seenPending: false
    });
  });

  it("can clear pending state after a mark-seen failure", () => {
    expect(
      clearDiscussionSeenPending({
        label: "PBG Discussion",
        href: "https://t.me/+Xpdv7ztBFFc1MGVh",
        unreadCount: 0,
        seenPending: true
      })
    ).toEqual({
      label: "PBG Discussion",
      href: "https://t.me/+Xpdv7ztBFFc1MGVh",
      unreadCount: 0,
      seenPending: false
    });
  });
});
