import { describe, expect, it } from "vitest";
import { createDashboardShellModel } from "../src/dashboardShell.js";
import { DEFAULT_DASHBOARD_FLAGS } from "../src/dashboardFlags.js";
import { computeLocalPbgDashboardState } from "../src/localState.js";

describe("dashboard shell model", () => {
  it("keeps Hermes-derived extras hidden by default", () => {
    const localState = computeLocalPbgDashboardState([]);
    const shell = createDashboardShellModel(localState, DEFAULT_DASHBOARD_FLAGS);

    expect(shell.leftRail.items.map((item) => item.label)).toEqual([
      "Dashboard",
      "Courses",
      "Assignments",
      "Workflows",
      "Results"
    ]);
    expect(shell.hiddenSections.showHermesShellExtras).toBe(false);
    expect(shell.hiddenSections.showHermesSidebarTools).toBe(false);
    expect(shell.hiddenSections.showHermesSecondaryPanels).toBe(false);
  });

  it("keeps the academy banner region enabled and announcement data attached to the header", () => {
    const localState = computeLocalPbgDashboardState([]);
    const shell = createDashboardShellModel(localState, DEFAULT_DASHBOARD_FLAGS, {
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
      ],
      activeItemIndex: 0,
      shouldBlink: true,
      lastSeenAnnouncementId: "academy-announcement-orientation",
      remainingBlinkCount: 3,
      motionPhase: "entering",
      pendingBlink: false
    });

    expect(shell.header.announcementBannerEnabled).toBe(true);
    expect(shell.header.announcements?.items[0]).toMatchObject({
      id: "academy-announcement-orientation",
      href: "https://github.com/thepbgacademy-hub/pbg-obsidian-academy-gateway"
    });
  });
});
