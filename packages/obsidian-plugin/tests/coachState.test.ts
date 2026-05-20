import { describe, expect, it } from "vitest";
import { createCoachUiState, getCoachActionCost, getVisibleCoachVariants } from "../src/coachState.js";

describe("coachState", () => {
  it("returns fixed costs for visible modes", () => {
    expect(getCoachActionCost("coach", null)).toBe(2);
    expect(getCoachActionCost("research", "standard")).toBe(5);
    expect(getCoachActionCost("research", "deep")).toBe(8);
    expect(getCoachActionCost("report", "basic-pdf")).toBe(10);
    expect(getCoachActionCost("report", "expanded-pdf-md")).toBe(15);
  });

  it("shows only research variants when research is selected", () => {
    expect(getVisibleCoachVariants("research")).toEqual(["standard", "deep"]);
  });

  it("surfaces a blocking state when credits are insufficient", () => {
    const state = createCoachUiState({
      creditBalance: 1,
      blockingReason: "insufficient-credits",
      selectedMode: "coach",
      selectedVariant: null
    });

    expect(state.canRun).toBe(false);
    expect(state.blockMessage).toContain("more PBG credits");
  });
});
