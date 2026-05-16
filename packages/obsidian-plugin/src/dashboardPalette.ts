import type { PbgDashboardPalette } from "./settings.js";

export const DASHBOARD_PALETTE_CLASS_MAP: Record<PbgDashboardPalette, string> = {
  "hermes-teal": "pbg-dashboard--palette-hermes-teal",
  "obsidian-native": "pbg-dashboard--palette-obsidian-native"
};

export const DASHBOARD_PALETTE_LABELS: Record<PbgDashboardPalette, string> = {
  "hermes-teal": "PBG Teal",
  "obsidian-native": "Obsidian Native"
};

export function getDashboardPaletteClass(palette: PbgDashboardPalette): string {
  return DASHBOARD_PALETTE_CLASS_MAP[palette];
}
