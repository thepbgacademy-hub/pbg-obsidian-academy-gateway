import { describe, expect, it } from "vitest";
import type {
  DashboardAnnouncementsPayload,
  DiscussionSeenResponse,
  DiscussionStatusPayload
} from "../src/contracts.js";
import { API_ROUTES, WORKFLOW_SLUGS } from "../src/contracts.js";

describe("shared contracts", () => {
  it("defines the first workflow slug", () => {
    expect(WORKFLOW_SLUGS.assignmentCoach).toBe("assignment-coach");
  });

  it("includes the dashboard announcements route", () => {
    expect(API_ROUTES.dashboardAnnouncements).toBe("/api/dashboard/announcements");
  });

  it("includes the discussion status route", () => {
    expect(API_ROUTES.discussionStatus).toBe("/api/lounge/discussion-status");
  });

  it("includes the discussion seen route", () => {
    expect(API_ROUTES.discussionSeen).toBe("/api/lounge/discussion-seen");
  });

  it("defines the Assignment Coach run route", () => {
    expect(API_ROUTES.assignmentCoachRun).toBe("/api/workflows/assignment-coach/run");
  });

  it("defines the dashboard announcements payload shape", () => {
    const payload: DashboardAnnouncementsPayload = {
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

    expect(payload.items[0]?.href).toContain("github.com/thepbgacademy-hub/pbg-obsidian-academy-gateway");
  });

  it("defines the discussion payload shapes", () => {
    const status: DiscussionStatusPayload = {
      label: "PBG Discussion",
      href: "https://t.me/+Xpdv7ztBFFc1MGVh",
      unreadCount: 9
    };
    const seen: DiscussionSeenResponse = {
      ok: true,
      unreadCount: 0
    };

    expect(status.label).toBe("PBG Discussion");
    expect(seen.ok).toBe(true);
  });
});
