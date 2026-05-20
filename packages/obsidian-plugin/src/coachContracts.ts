import type {
  CoachMode,
  CoachPanelStatusPayload,
  CoachRunRequest,
  CoachRunResponse,
  CoachVariant,
  ProviderId,
  ReportKind
} from "@pbg/shared/contracts";

export type {
  CoachMode,
  CoachPanelStatusPayload,
  CoachRunRequest,
  CoachRunResponse,
  CoachVariant,
  ProviderId,
  ReportKind
};

export const DEFAULT_COACH_MODE: CoachMode = "coach";
export const DEFAULT_COACH_VARIANT: CoachVariant = null;

export function isReportKind(value: CoachVariant): value is ReportKind {
  return value === "basic-pdf" || value === "expanded-pdf-md";
}
