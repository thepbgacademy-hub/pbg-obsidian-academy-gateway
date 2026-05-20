import { describe, expect, it, vi } from "vitest";

vi.mock("obsidian", () => ({ ItemView: class {} }));

import { PbgDashboardView } from "../src/dashboardView.js";

describe("dashboard coach lifecycle", () => {
  it("renders after coach status refresh", async () => {
    const renderDashboard = vi.fn();
    const fakeView = {
      isDisposed: false,
      coachStatus: {
        providerOptions: [],
        selectedProviderId: null,
        creditBalance: 0,
        contextLabel: null,
        currentThreadId: null,
        blockingReason: null
      },
      getGatewayClient: () => ({
        getCoachStatus: async () => ({
          providerOptions: [{ id: "openai", label: "OpenAI", recommended: true, connected: false }],
          selectedProviderId: null,
          creditBalance: 42,
          contextLabel: "Context: Assignment + related academy materials",
          currentThreadId: "assignment:connect-first-workflow",
          blockingReason: "missing-provider"
        })
      }),
      renderDashboard
    };

    await (PbgDashboardView.prototype as unknown as {
      refreshCoachStatus(this: typeof fakeView): Promise<void>;
    }).refreshCoachStatus.call(fakeView);

    expect(renderDashboard).toHaveBeenCalled();
    expect(fakeView.coachStatus.creditBalance).toBe(42);
  });
});
