import { describe, expect, it } from "vitest";
import { DEFAULT_DASHBOARD_FLAGS } from "../src/dashboardFlags.js";

describe("dashboard flags", () => {
  it("enables the academy banner and hides Hermes-derived regions by default", () => {
    expect(DEFAULT_DASHBOARD_FLAGS).toEqual({
      showAcademyAnnouncementBanner: true,
      showHermesShellExtras: false,
      showHermesSidebarTools: false,
      showHermesSecondaryPanels: false
    });
  });
});
