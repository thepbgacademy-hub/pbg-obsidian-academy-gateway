import { describe, expect, it } from "vitest";
import { WORKFLOW_SLUGS } from "../src/contracts.js";

describe("shared contracts", () => {
  it("defines the first workflow slug", () => {
    expect(WORKFLOW_SLUGS.assignmentCoach).toBe("assignment-coach");
  });
});
