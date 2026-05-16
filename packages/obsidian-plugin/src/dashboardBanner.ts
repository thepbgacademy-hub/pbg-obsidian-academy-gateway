import type { AnnouncementViewState } from "./announcements.js";

export function getAnnouncementBannerState(
  announcements?: AnnouncementViewState
):
  | { kind: "placeholder"; text: string }
  | {
      kind: "link";
      href: string;
      label: string;
      text: string;
      shouldBlink: boolean;
      motionPhase: "resting" | "entering";
      isProminent: boolean;
    } {
  const announcement = announcements?.items[announcements.activeItemIndex];
  if (!announcement) {
    return {
      kind: "placeholder",
      text: "Academy announcements will appear here."
    };
  }

  const safeHref = getSafeAnnouncementHref(announcement.href);
  if (!safeHref) {
    return {
      kind: "placeholder",
      text: "Academy announcement link is unavailable right now."
    };
  }

  return {
    kind: "link",
    href: safeHref,
    label: announcement.label,
    text: announcement.text,
    shouldBlink: Boolean(announcements?.shouldBlink),
    motionPhase: announcements?.motionPhase ?? "resting",
    isProminent: true
  };
}

function getSafeAnnouncementHref(href: string): string | null {
  try {
    const parsed = new URL(href);
    if (parsed.protocol === "http:" || parsed.protocol === "https:") {
      return parsed.toString();
    }
  } catch {
    return null;
  }

  return null;
}
