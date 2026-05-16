import { describe, expect, it } from "vitest";
import {
  advanceAnnouncementBlink,
  createAnnouncementViewState,
  mergeAnnouncementPayload,
  settleAnnouncementMotion,
  startAnnouncementBlink
} from "../src/announcements.js";

const orientationPayload = {
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
  ]
};

describe("announcement state", () => {
  it("creates an empty idle banner state", () => {
    expect(createAnnouncementViewState()).toEqual({
      items: [],
      activeItemIndex: 0,
      shouldBlink: false,
      lastSeenAnnouncementId: null,
      remainingBlinkCount: 0,
      motionPhase: "resting",
      pendingBlink: false
    });
  });

  it("marks a new announcement as entering and queues blink for after settle", () => {
    const next = mergeAnnouncementPayload(createAnnouncementViewState(), orientationPayload);

    expect(next.shouldBlink).toBe(false);
    expect(next.lastSeenAnnouncementId).toBe("academy-announcement-orientation");
    expect(next.remainingBlinkCount).toBe(0);
    expect(next.motionPhase).toBe("entering");
    expect(next.pendingBlink).toBe(true);
  });

  it("stops blinking after three advance steps", () => {
    const first = mergeAnnouncementPayload(createAnnouncementViewState(), orientationPayload);
    const armed = startAnnouncementBlink(settleAnnouncementMotion(first));
    const second = advanceAnnouncementBlink(armed);
    const third = advanceAnnouncementBlink(second);
    const fourth = advanceAnnouncementBlink(third);

    expect(second.remainingBlinkCount).toBe(2);
    expect(third.remainingBlinkCount).toBe(1);
    expect(fourth).toMatchObject({
      shouldBlink: false,
      remainingBlinkCount: 0
    });
  });

  it("does not retrigger blink for the same leading announcement id", () => {
    const first = mergeAnnouncementPayload(createAnnouncementViewState(), orientationPayload);
    const second = mergeAnnouncementPayload(first, {
      items: first.items
    });

    expect(second.shouldBlink).toBe(false);
    expect(second.remainingBlinkCount).toBe(0);
    expect(second.pendingBlink).toBe(false);
  });

  it("settles a new announcement into a resting centered phase", () => {
    const entering = mergeAnnouncementPayload(createAnnouncementViewState(), orientationPayload);
    const settled = settleAnnouncementMotion(entering);

    expect(settled.motionPhase).toBe("resting");
    expect(settled.items[0]?.id).toBe("academy-announcement-orientation");
  });

  it("starts blink only after the announcement settles", () => {
    const entering = mergeAnnouncementPayload(createAnnouncementViewState(), orientationPayload);
    const blinking = startAnnouncementBlink(settleAnnouncementMotion(entering));

    expect(blinking.shouldBlink).toBe(true);
    expect(blinking.remainingBlinkCount).toBe(3);
    expect(blinking.pendingBlink).toBe(false);
  });
});
