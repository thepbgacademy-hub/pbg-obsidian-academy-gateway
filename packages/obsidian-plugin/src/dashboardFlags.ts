export interface DashboardFlags {
  showAcademyAnnouncementBanner: boolean;
  showHermesShellExtras: boolean;
  showHermesSidebarTools: boolean;
  showHermesSecondaryPanels: boolean;
}

export const DEFAULT_DASHBOARD_FLAGS: DashboardFlags = {
  showAcademyAnnouncementBanner: true,
  showHermesShellExtras: false,
  showHermesSidebarTools: false,
  showHermesSecondaryPanels: false
};
