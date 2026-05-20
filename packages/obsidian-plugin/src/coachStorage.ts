import type { CoachContextType, ReportKind } from "@pbg/shared/contracts";

export function getCoachThreadPath(contextType: CoachContextType, contextId: string): string {
  return `PBG/Coach Threads/${contextType}-${contextId}.md`;
}

export function getReportArtifactPaths(kind: ReportKind, contextId: string): string[] {
  if (kind === "expanded-pdf-md") {
    return [
      `PBG/Reports/${contextId}-expanded-report.pdf`,
      `PBG/Reports/${contextId}-expanded-report.md`
    ];
  }

  return [`PBG/Reports/${contextId}-basic-report.pdf`];
}

export async function appendCoachTurn(
  vault: {
    getAbstractFileByPath(path: string): unknown;
    create(path: string, body: string): Promise<unknown>;
    append(file: unknown, body: string): Promise<void>;
  },
  path: string,
  markdown: string
): Promise<void> {
  const existing = vault.getAbstractFileByPath(path);
  if (!existing) {
    await vault.create(path, markdown);
    return;
  }

  await vault.append(existing, `\n\n${markdown}`);
}
