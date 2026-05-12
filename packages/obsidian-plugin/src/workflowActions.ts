import type { AssignmentCoachRunRequest, AssignmentCoachRunResponse } from "@pbg/shared/workflowContracts";
import type { TFile, Vault } from "obsidian";

export interface AssignmentCoachClient {
  runAssignmentCoach(payload: AssignmentCoachRunRequest): Promise<AssignmentCoachRunResponse>;
}

export async function runAssignmentCoachForFile(input: {
  file: TFile;
  vault: Vault;
  client: AssignmentCoachClient;
}): Promise<string> {
  const assignmentBody = await input.vault.read(input.file);
  const response = await input.client.runAssignmentCoach({
    assignmentPath: input.file.path,
    assignmentTitle: input.file.basename,
    assignmentBody,
    relatedContext: [],
    localMetadata: {
      ...countMarkdownTasks(assignmentBody),
      tags: collectAcademyTags(assignmentBody)
    }
  });

  await ensureFolderPath(input.vault, "PBG/Workflow Results");

  const resultPath = getAvailableResultPath(input.vault, response.runId);
  await input.vault.create(resultPath, response.result.markdown);
  return resultPath;
}

function countMarkdownTasks(markdown: string): { taskCount: number; completedTaskCount: number } {
  const tasks = markdown.match(/^\s*[-*]\s+\[[ xX]\]\s+/gm) ?? [];
  const completedTasks = markdown.match(/^\s*[-*]\s+\[[xX]\]\s+/gm) ?? [];

  return {
    taskCount: tasks.length,
    completedTaskCount: completedTasks.length
  };
}

function collectAcademyTags(markdown: string): string[] {
  return /(^|\s)#academy(\s|$)/.test(markdown) || frontmatterHasAcademyTag(markdown) ? ["academy"] : [];
}

function frontmatterHasAcademyTag(markdown: string): boolean {
  const frontmatter = markdown.match(/^---\n([\s\S]*?)\n---/);
  return frontmatter?.[1] ? /^\s*-?\s*academy\s*$/m.test(frontmatter[1]) : false;
}

async function ensureFolderPath(vault: Vault, folderPath: string): Promise<void> {
  const segments = folderPath.split("/");
  let currentPath = "";

  for (const segment of segments) {
    currentPath = currentPath ? `${currentPath}/${segment}` : segment;

    if (vault.getAbstractFileByPath(currentPath)) {
      continue;
    }

    await vault.createFolder(currentPath);
  }
}

function getAvailableResultPath(vault: Vault, runId: string): string {
  const basePath = `PBG/Workflow Results/${runId}`;
  let path = `${basePath}.md`;
  let suffix = 1;

  while (vault.getAbstractFileByPath(path)) {
    path = `${basePath}-${suffix}.md`;
    suffix += 1;
  }

  return path;
}
