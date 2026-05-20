import type { CoachMode, CoachPanelStatusPayload, CoachVariant } from "./coachContracts.js";

export interface CoachPanelModel {
  title: string;
  primaryModes: Array<{ id: CoachMode; label: string; selected: boolean }>;
  secondaryModes: Array<{ id: Exclude<CoachVariant, null>; label: string; selected: boolean }>;
  creditBalance: number;
  contextLabel: string | null;
}

export function buildCoachPanelModel(input: {
  selectedMode: CoachMode;
  selectedVariant: CoachVariant;
  creditBalance: number;
  blockingReason: CoachPanelStatusPayload["blockingReason"];
  contextLabel: string | null;
}): CoachPanelModel {
  return {
    title: "Coach",
    primaryModes: [
      { id: "coach", label: "Coach 2", selected: input.selectedMode === "coach" },
      { id: "research", label: "Research", selected: input.selectedMode === "research" },
      { id: "report", label: "Reports", selected: input.selectedMode === "report" }
    ],
    secondaryModes:
      input.selectedMode === "research"
        ? [
            { id: "standard", label: "Standard 5", selected: input.selectedVariant === "standard" },
            { id: "deep", label: "Deep 8", selected: input.selectedVariant === "deep" }
          ]
        : input.selectedMode === "report"
          ? [
              { id: "basic-pdf", label: "Basic PDF 10", selected: input.selectedVariant === "basic-pdf" },
              { id: "expanded-pdf-md", label: "Expanded PDF + MD 15", selected: input.selectedVariant === "expanded-pdf-md" }
            ]
          : [],
    creditBalance: input.creditBalance,
    contextLabel: input.contextLabel
  };
}
