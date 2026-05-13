import esbuild from "esbuild";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

export function createBuildOptions({ mode = process.env.NODE_ENV === "development" ? "development" : "production" } = {}) {
  const isProduction = mode === "production";

  return {
    entryPoints: ["src/main.ts"],
    bundle: true,
    external: ["obsidian"],
    format: "cjs",
    target: "es2018",
    outfile: "dist/main.js",
    sourcemap: isProduction ? false : "inline"
  };
}

export function isDirectBuildInvocation(moduleUrl, argvPath = process.argv[1]) {
  return Boolean(argvPath && moduleUrl === pathToFileURL(resolve(argvPath)).href);
}

if (isDirectBuildInvocation(import.meta.url)) {
  await esbuild.build(createBuildOptions());
}
