import type { CoachMode, CoachPanelStatusPayload, CoachVariant } from "./coachContracts.js";

export interface CoachUiState {
  cost: number;
  canRun: boolean;
  blockMessage: string | null;
}

export function getCoachActionCost(mode: CoachMode, variant: CoachVariant): number {
  if (mode === "coach") {
    return 2;
  }

  if (mode === "research") {
    return variant === "deep" ? 8 : 5;
  }

  return variant === "expanded-pdf-md" ? 15 : 10;
}

export function getVisibleCoachVariants(mode: CoachMode): CoachVariant[] {
  if (mode === "research") {
    return ["standard", "deep"];
  }

  if (mode === "report") {
    return ["basic-pdf", "expanded-pdf-md"];
  }

  return [];
}

export function getCoachBlockMessage(reason: CoachPanelStatusPayload["blockingReason"]): string | null {
  if (reason === "missing-provider") {
    return "Connect a provider to use Coach";
  }

  if (reason === "insufficient-credits") {
    return "You need more PBG credits for this action";
  }

  if (reason === "missing-context") {
    return "Open a course or assignment context to continue";
  }

  return null;
}

export function createCoachUiState(input: {
  creditBalance: number;
  blockingReason: CoachPanelStatusPayload["blockingReason"];
  selectedMode: CoachMode;
  selectedVariant: CoachVariant;
}): CoachUiState {
  const blockMessage = getCoachBlockMessage(input.blockingReason);

  return {
    cost: getCoachActionCost(input.selectedMode, input.selectedVariant),
    canRun: blockMessage === null,
    blockMessage
  };
}
