import type { AnnouncementViewState } from "./announcements.js";
import type { DashboardFlags } from "./dashboardFlags.js";
import {
  getDiscussionBadgeLabel,
  type DiscussionStatusState
} from "./discussionStatus.js";
import type { LocalPbgDashboardState } from "./localState.js";

export interface DashboardShellRailItem {
  id: string;
  label: string;
  badgeLabel?: string | null;
  href?: string | null;
  external?: boolean;
}

export interface DashboardShellModel {
  header: {
    title: string;
    subtitle: string;
    announcementBannerEnabled: boolean;
    announcements?: AnnouncementViewState;
  };
  leftRail: {
    items: DashboardShellRailItem[];
  };
  hiddenSections: {
    showHermesShellExtras: boolean;
    showHermesSidebarTools: boolean;
    showHermesSecondaryPanels: boolean;
  };
  main: LocalPbgDashboardState;
}

const DEFAULT_LEFT_RAIL_ITEMS: DashboardShellRailItem[] = [
  { id: "dashboard", label: "Dashboard" },
  { id: "courses", label: "Courses" },
  { id: "assignments", label: "Assignments" },
  { id: "workflows", label: "Workflows" },
  { id: "results", label: "Results" }
];

export function createDashboardShellModel(
  localState: LocalPbgDashboardState,
  flags: DashboardFlags,
  announcements?: AnnouncementViewState,
  discussionStatus?: DiscussionStatusState
): DashboardShellModel {
  const leftRailItems = [...DEFAULT_LEFT_RAIL_ITEMS];
  if (discussionStatus) {
    leftRailItems.push({
      id: "pbg-discussion",
      label: discussionStatus.label,
      badgeLabel: getDiscussionBadgeLabel(discussionStatus.unreadCount),
      href: discussionStatus.href,
      external: true
    });
  }

  return {
    header: {
      title: "PBG Academy",
      subtitle: "Local academy workspace for course notes, assignments, and workflow results.",
      announcementBannerEnabled: flags.showAcademyAnnouncementBanner,
      announcements
    },
    leftRail: {
      items: leftRailItems
    },
    hiddenSections: {
      showHermesShellExtras: flags.showHermesShellExtras,
      showHermesSidebarTools: flags.showHermesSidebarTools,
      showHermesSecondaryPanels: flags.showHermesSecondaryPanels
    },
    main: localState
  };
}
