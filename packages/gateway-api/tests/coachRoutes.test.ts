import { describe, expect, it } from "vitest";
import { API_ROUTES } from "@pbg/shared/contracts";
import { buildApp } from "../src/app.js";

describe("coach routes", () => {
  it("returns coach panel status for an authenticated student", async () => {
    const app = buildApp();

    const response = await app.inject({
      method: "GET",
      url: API_ROUTES.coachStatus,
      headers: {
        authorization: "Bearer short-lived-token"
      }
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      creditBalance: expect.any(Number),
      providerOptions: expect.arrayContaining([
        expect.objectContaining({ id: "openai", recommended: true })
      ])
    });

    await app.close();
  });

  it("runs coach mode and returns a thread path", async () => {
    const app = buildApp();

    const response = await app.inject({
      method: "POST",
      url: API_ROUTES.coachRun,
      headers: {
        authorization: "Bearer short-lived-token"
      },
      payload: {
        mode: "coach",
        variant: null,
        prompt: "Explain the next task.",
        contextType: "assignment",
        contextId: "connect-first-workflow"
      }
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      creditsDebited: 2,
      threadPath: expect.stringContaining("PBG/Coach Threads/")
    });

    await app.close();
  });

  it("blocks coach runs when prompt is blank", async () => {
    const app = buildApp();

    const response = await app.inject({
      method: "POST",
      url: API_ROUTES.coachRun,
      headers: {
        authorization: "Bearer short-lived-token"
      },
      payload: {
        mode: "coach",
        variant: null,
        prompt: "   ",
        contextType: "assignment",
        contextId: "x"
      }
    });

    expect(response.statusCode).toBe(400);
    expect(response.json()).toEqual({
      error: "Prompt is required."
    });

    await app.close();
  });

  it("returns fixed credit pricing for expanded reports", async () => {
    const app = buildApp();

    const response = await app.inject({
      method: "POST",
      url: API_ROUTES.coachRun,
      headers: {
        authorization: "Bearer short-lived-token"
      },
      payload: {
        mode: "report",
        variant: "expanded-pdf-md",
        prompt: "Generate the report.",
        contextType: "assignment",
        contextId: "connect-first-workflow"
      }
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      creditsDebited: 15,
      reportArtifacts: expect.arrayContaining([
        expect.objectContaining({ kind: "expanded-pdf-md" }),
        expect.objectContaining({ kind: "markdown-companion" })
      ])
    });

    await app.close();
  });
});
