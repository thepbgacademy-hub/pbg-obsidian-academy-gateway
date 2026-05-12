import type { CourseManifest } from "@pbg/shared/courseManifest";

export interface ManifestWritePlanItem {
  path: string;
  body: string;
}

export function getManifestWritePlan(manifest: CourseManifest): ManifestWritePlanItem[] {
  return manifest.files.map((file) => {
    assertPbgPath(file.path);

    return {
      path: file.path,
      body: file.body
    };
  });
}

function assertPbgPath(path: string): void {
  if (path !== "PBG" && !path.startsWith("PBG/")) {
    throw new Error(`Refusing to sync course manifest path outside PBG: ${path}`);
  }

  if (path.includes("..") || path.includes("\\") || path.startsWith("/") || path.trim() !== path) {
    throw new Error(`Refusing unsafe course manifest path outside PBG: ${path}`);
  }
}
