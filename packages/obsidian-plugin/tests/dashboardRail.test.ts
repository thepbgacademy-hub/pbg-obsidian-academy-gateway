import { describe, expect, it } from "vitest";
import { DEFAULT_DASHBOARD_FLAGS } from "../src/dashboardFlags.js";
import { createDiscussionStatusState } from "../src/discussionStatus.js";
import { createDashboardShellModel } from "../src/dashboardShell.js";
import { computeLocalPbgDashboardState } from "../src/localState.js";

describe("dashboard left rail model", () => {
  it("includes the PBG Discussion item with badge data", () => {
    const shell = createDashboardShellModel(
      computeLocalPbgDashboardState([]),
      DEFAULT_DASHBOARD_FLAGS,
      undefined,
      {
        ...createDiscussionStatusState(),
        href: "https://t.me/+Xpdv7ztBFFc1MGVh",
        unreadCount: 12
      }
    );

    expect(shell.leftRail.items.at(-1)).toEqual({
      id: "pbg-discussion",
      label: "PBG Discussion",
      badgeLabel: "9+",
      href: "https://t.me/+Xpdv7ztBFFc1MGVh",
      external: true
    });
  });

  it("omits the discussion badge when the unread count is zero", () => {
    const shell = createDashboardShellModel(
      computeLocalPbgDashboardState([]),
      DEFAULT_DASHBOARD_FLAGS,
      undefined,
      createDiscussionStatusState()
    );

    expect(shell.leftRail.items.at(-1)).toEqual({
      id: "pbg-discussion",
      label: "PBG Discussion",
      badgeLabel: null,
      href: null,
      external: true
    });
  });
});
