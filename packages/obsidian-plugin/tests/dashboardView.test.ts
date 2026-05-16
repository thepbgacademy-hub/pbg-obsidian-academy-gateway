import { describe, expect, it } from "vitest";
import { getAnnouncementBannerState } from "../src/dashboardBanner.js";

describe("dashboard view banner state", () => {
  it("returns a placeholder when no active announcement exists", () => {
    expect(getAnnouncementBannerState()).toEqual({
      kind: "placeholder",
      text: "Academy announcements will appear here."
    });
  });

  it("returns a clickable banner model for the leading active announcement", () => {
    expect(
      getAnnouncementBannerState({
        items: [
          {
            id: "academy-announcement-orientation",
            label: "Academy Update",
            text: "Orientation week resources are now live in your PBG vault.",
            href: "https://github.com/thepbgacademy-hub/pbg-obsidian-academy-gateway",
            publishedAt: "2026-05-15T00:00:00.000Z",
            expiresAt: null,
            isActive: true
          }
        ],
        activeItemIndex: 0,
        shouldBlink: true,
        lastSeenAnnouncementId: "academy-announcement-orientation",
        remainingBlinkCount: 3,
        motionPhase: "entering",
        pendingBlink: false
      })
    ).toEqual({
      kind: "link",
      href: "https://github.com/thepbgacademy-hub/pbg-obsidian-academy-gateway",
      label: "Academy Update",
      text: "Orientation week resources are now live in your PBG vault.",
      shouldBlink: true,
      motionPhase: "entering",
      isProminent: true
    });
  });

  it("falls back to a placeholder when the banner href uses a non-web scheme", () => {
    expect(
      getAnnouncementBannerState({
        items: [
          {
            id: "academy-announcement-orientation",
            label: "Academy Update",
            text: "Orientation week resources are now live in your PBG vault.",
            href: "obsidian://open?vault=PBG",
            publishedAt: "2026-05-15T00:00:00.000Z",
            expiresAt: null,
            isActive: true
          }
        ],
        activeItemIndex: 0,
        shouldBlink: false,
        lastSeenAnnouncementId: "academy-announcement-orientation",
        remainingBlinkCount: 0,
        motionPhase: "resting",
        pendingBlink: false
      })
    ).toEqual({
      kind: "placeholder",
      text: "Academy announcement link is unavailable right now."
    });
  });
});
