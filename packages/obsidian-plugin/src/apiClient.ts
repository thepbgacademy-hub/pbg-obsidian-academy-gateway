import type { CourseManifest } from "@pbg/shared/courseManifest";

export async function getCourseManifest(gatewayBaseUrl: string): Promise<CourseManifest> {
  const manifestUrl = new URL("/api/courses/manifest", gatewayBaseUrl);
  const response = await fetch(manifestUrl);

  if (!response.ok) {
    let details = "";

    try {
      details = await response.text();
    } catch {
      details = "";
    }

    const suffix = details.trim() ? `: ${details.trim()}` : "";
    throw new Error(`Failed to fetch course manifest (${response.status} ${response.statusText})${suffix}`);
  }

  return (await response.json()) as CourseManifest;
}
