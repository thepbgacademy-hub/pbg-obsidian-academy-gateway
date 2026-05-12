import { describe, expect, it } from "vitest";
import { API_ROUTES, WORKFLOW_SLUGS } from "../src/contracts.js";

describe("shared contracts", () => {
  it("defines the first workflow slug", () => {
    expect(WORKFLOW_SLUGS.assignmentCoach).toBe("assignment-coach");
  });

  it("defines the Assignment Coach run route", () => {
    expect(API_ROUTES.assignmentCoachRun).toBe("/api/workflows/assignment-coach/run");
  });
});
