import { describe, expect, it } from "vitest";
// @ts-expect-error esbuild config is an ESM JavaScript file exercised by Vitest.
import { createBuildOptions, isDirectBuildInvocation } from "../esbuild.config.mjs";

describe("obsidian plugin esbuild config", () => {
  it("disables sourcemaps for production builds", () => {
    expect(createBuildOptions({ mode: "production" }).sourcemap).toBe(false);
  });

  it("keeps inline sourcemaps for development builds", () => {
    expect(createBuildOptions({ mode: "development" }).sourcemap).toBe("inline");
  });

  it("detects direct execution from a Windows script path", () => {
    expect(
      isDirectBuildInvocation(
        "file:///C:/tmp/pbg-obsidian-academy-gateway-work/packages/obsidian-plugin/esbuild.config.mjs",
        "C:\\tmp\\pbg-obsidian-academy-gateway-work\\packages\\obsidian-plugin\\esbuild.config.mjs"
      )
    ).toBe(true);
  });
});
