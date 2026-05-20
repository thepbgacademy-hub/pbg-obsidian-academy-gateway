import { describe, expect, it } from "vitest";
import { buildCoachPanelModel } from "../src/coachPanel.js";

describe("coachPanel", () => {
  it("shows only the primary row until a research mode is selected", () => {
    const model = buildCoachPanelModel({
      selectedMode: "coach",
      selectedVariant: null,
      creditBalance: 42,
      blockingReason: null,
      contextLabel: "Context: Assignment + related academy materials"
    });

    expect(model.primaryModes.map((item) => item.label)).toEqual(["Coach 2", "Research", "Reports"]);
    expect(model.secondaryModes).toEqual([]);
  });

  it("shows research secondary buttons with explicit costs", () => {
    const model = buildCoachPanelModel({
      selectedMode: "research",
      selectedVariant: "standard",
      creditBalance: 42,
      blockingReason: null,
      contextLabel: "Context: Assignment + related academy materials"
    });

    expect(model.secondaryModes.map((item) => item.label)).toEqual(["Standard 5", "Deep 8"]);
  });
});
