import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("obsidian", () => ({ ItemView: class {} }));

import { PbgDashboardView } from "../src/dashboardView.js";

describe("PbgDashboardView announcement lifecycle", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("does not rerender or restart blink when a refresh resolves after the view is disposed", async () => {
    const payload = {
      items: [
        {
          id: "academy-announcement-orientation",
          label: "Academy Update",
          text: "Orientation week resources are now live in your PBG vault.",
          href: "https://github.com/thepbgacademy-hub/pbg-obsidian-academy-gateway",
          publishedAt: "2026-05-15T00:00:00.000Z",
          expiresAt: null,
          isActive: true
        }
      ]
    };

    const renderDashboard = vi.fn();
    const runAnnouncementBlinkCycle = vi.fn();
    const fakeView = {
      isDisposed: false,
      announcementState: {
        items: [],
        activeItemIndex: 0,
        shouldBlink: false,
        lastSeenAnnouncementId: null,
        remainingBlinkCount: 0
      },
      getGatewayClient: () => ({
        getDashboardAnnouncements: async () => {
          fakeView.isDisposed = true;
          return payload;
        }
      }),
      renderDashboard,
      runAnnouncementBlinkCycle
    };

    await (PbgDashboardView.prototype as unknown as {
      refreshAnnouncements(this: typeof fakeView): Promise<void>;
    }).refreshAnnouncements.call(fakeView);

    expect(renderDashboard).not.toHaveBeenCalled();
    expect(runAnnouncementBlinkCycle).not.toHaveBeenCalled();
    expect(fakeView.announcementState.items).toEqual([]);
  });

  it("does not start polling when the view closes during startup refresh", async () => {
    const contentEl = {
      empty: vi.fn(),
      addClass: vi.fn()
    };
    const renderDashboard = vi.fn();
    const startAnnouncementPolling = vi.fn();
    const fakeView = {
      isDisposed: false,
      contentEl,
      localDashboardState: undefined,
      announcementState: undefined,
      getLocalPbgFileSnapshots: async () => [],
      renderDashboard,
      refreshAnnouncements: async () => {
        fakeView.isDisposed = true;
      },
      startAnnouncementPolling
    };

    await (PbgDashboardView.prototype as unknown as {
      onOpen(this: typeof fakeView): Promise<void>;
    }).onOpen.call(fakeView);

    expect(renderDashboard).toHaveBeenCalledTimes(1);
    expect(startAnnouncementPolling).not.toHaveBeenCalled();
  });

  it("clears discussion count locally when the rail item is clicked", async () => {
    const openSpy = vi.fn();
    const originalOpen = (globalThis as typeof globalThis & { open?: typeof open }).open;
    (globalThis as typeof globalThis & { open?: typeof open }).open = openSpy as typeof open;
    const renderDashboard = vi.fn();
    const fakeView = {
      isDisposed: false,
      discussionStatus: {
        label: "PBG Discussion",
        href: "https://t.me/+Xpdv7ztBFFc1MGVh",
        unreadCount: 4,
        seenPending: false
      },
      getGatewayClient: () => ({
        markDiscussionSeen: vi.fn().mockResolvedValue({
          ok: true,
          unreadCount: 0
        })
      }),
      renderDashboard
    };

    (PbgDashboardView.prototype as unknown as {
      handleRailItemClick(this: typeof fakeView, item: { id: string }): void;
    }).handleRailItemClick.call(fakeView, { id: "pbg-discussion" });

    expect(openSpy).toHaveBeenCalledWith("https://t.me/+Xpdv7ztBFFc1MGVh", "_blank", "noopener,noreferrer");
    expect(fakeView.discussionStatus).toMatchObject({
      unreadCount: 0,
      seenPending: true
    });
    await Promise.resolve();
    await Promise.resolve();
    expect(fakeView.discussionStatus).toMatchObject({
      unreadCount: 0,
      seenPending: false
    });
    expect(renderDashboard).toHaveBeenCalled();
    (globalThis as typeof globalThis & { open?: typeof open }).open = originalOpen;
  });

  it("clears stale discussion state when the gateway rejects the saved token", async () => {
    const renderDashboard = vi.fn();
    const fakeView = {
      isDisposed: false,
      discussionStatus: {
        label: "PBG Discussion",
        href: "https://t.me/+Xpdv7ztBFFc1MGVh",
        unreadCount: 4,
        seenPending: false
      },
      getGatewayClient: () => ({
        getDiscussionStatus: async () => {
          throw new Error("Gateway request failed (401 Unauthorized): invalid token");
        }
      }),
      renderDashboard,
      clearDiscussionStatusIfNeeded: (PbgDashboardView.prototype as unknown as {
        clearDiscussionStatusIfNeeded(this: { discussionStatus: unknown; renderDashboard: () => void }): void;
      }).clearDiscussionStatusIfNeeded
    };

    await (PbgDashboardView.prototype as unknown as {
      refreshDiscussionStatus(this: typeof fakeView): Promise<void>;
    }).refreshDiscussionStatus.call(fakeView);

    expect(fakeView.discussionStatus).toEqual({
      label: "PBG Discussion",
      href: null,
      unreadCount: 0,
      seenPending: false
    });
    expect(renderDashboard).toHaveBeenCalled();
  });

  it("clears discussion state when mark-seen fails with an invalid token", async () => {
    const openSpy = vi.fn();
    const originalOpen = (globalThis as typeof globalThis & { open?: typeof open }).open;
    (globalThis as typeof globalThis & { open?: typeof open }).open = openSpy as typeof open;
    const renderDashboard = vi.fn();
    const fakeView = {
      isDisposed: false,
      discussionStatus: {
        label: "PBG Discussion",
        href: "https://t.me/+Xpdv7ztBFFc1MGVh",
        unreadCount: 2,
        seenPending: false
      },
      getGatewayClient: () => ({
        markDiscussionSeen: vi.fn().mockRejectedValue(
          new Error("Gateway request failed (401 Unauthorized): invalid token")
        )
      }),
      renderDashboard
    };

    (PbgDashboardView.prototype as unknown as {
      handleRailItemClick(this: typeof fakeView, item: { id: string }): void;
    }).handleRailItemClick.call(fakeView, { id: "pbg-discussion" });

    await Promise.resolve();
    await Promise.resolve();

    expect(fakeView.discussionStatus).toEqual({
      label: "PBG Discussion",
      href: null,
      unreadCount: 0,
      seenPending: false
    });
    expect(renderDashboard).toHaveBeenCalled();
    (globalThis as typeof globalThis & { open?: typeof open }).open = originalOpen;
  });
});
