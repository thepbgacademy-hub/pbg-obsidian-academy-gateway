import { describe, expect, it } from "vitest";
import { createContextPreviewMessage } from "../src/contextPreview.js";

describe("context preview", () => {
  it("summarizes outbound note context before workflow run", () => {
    expect(createContextPreviewMessage(1, 2)).toBe(
      "Sending 1 assignment note and 2 related course notes."
    );
  });

  it("uses singular labels when one note is sent", () => {
    expect(createContextPreviewMessage(1, 1)).toBe(
      "Sending 1 assignment note and 1 related course note."
    );
  });
});
