export function normalizeVaultPath(path: string): string {
  const normalized = path.replace(/\\/g, "/").replace(/^\/+/, "").replace(/\/$/, "");
  const segments = normalized.split("/");

  if (segments.some((segment) => !segment || segment === "." || segment === "..")) {
    return "";
  }

  return segments.join("/");
}

export function isPbgScopedPath(path: string): boolean {
  const normalized = normalizeVaultPath(path);
  return normalized === "PBG" || normalized.startsWith("PBG/");
}
