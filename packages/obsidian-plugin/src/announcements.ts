import type {
  DashboardAnnouncementItem,
  DashboardAnnouncementsPayload
} from "@pbg/shared/contracts";

export type { DashboardAnnouncementItem, DashboardAnnouncementsPayload } from "@pbg/shared/contracts";

export interface AnnouncementViewState {
  items: DashboardAnnouncementItem[];
  activeItemIndex: number;
  shouldBlink: boolean;
  lastSeenAnnouncementId: string | null;
  remainingBlinkCount: number;
  motionPhase: "resting" | "entering";
  pendingBlink: boolean;
}

const BLINK_CYCLE_COUNT = 3;

export function createAnnouncementViewState(): AnnouncementViewState {
  return {
    items: [],
    activeItemIndex: 0,
    shouldBlink: false,
    lastSeenAnnouncementId: null,
    remainingBlinkCount: 0,
    motionPhase: "resting",
    pendingBlink: false
  };
}

export function mergeAnnouncementPayload(
  previous: AnnouncementViewState,
  payload: DashboardAnnouncementsPayload
): AnnouncementViewState {
  const activeItems = payload.items.filter((item) => item.isActive);
  const firstId = activeItems[0]?.id ?? null;
  const isNewLead = firstId !== null && firstId !== previous.lastSeenAnnouncementId;

  return {
    items: activeItems,
    activeItemIndex: 0,
    shouldBlink: false,
    lastSeenAnnouncementId: firstId,
    remainingBlinkCount: 0,
    motionPhase: isNewLead ? "entering" : previous.motionPhase,
    pendingBlink: isNewLead
  };
}

export function advanceAnnouncementBlink(state: AnnouncementViewState): AnnouncementViewState {
  if (!state.shouldBlink || state.remainingBlinkCount <= 0) {
    return {
      ...state,
      shouldBlink: false,
      remainingBlinkCount: 0
    };
  }

  const remainingBlinkCount = state.remainingBlinkCount - 1;
  return {
    ...state,
    shouldBlink: remainingBlinkCount > 0,
    remainingBlinkCount,
    pendingBlink: false
  };
}

export function settleAnnouncementMotion(state: AnnouncementViewState): AnnouncementViewState {
  if (state.motionPhase !== "entering") {
    return state;
  }

  return {
    ...state,
    motionPhase: "resting"
  };
}

export function startAnnouncementBlink(state: AnnouncementViewState): AnnouncementViewState {
  if (!state.pendingBlink) {
    return state;
  }

  return {
    ...state,
    shouldBlink: true,
    remainingBlinkCount: BLINK_CYCLE_COUNT,
    pendingBlink: false
  };
}
