import type { AssignmentCoachRunRequest, AssignmentCoachRunResponse } from "@pbg/shared/workflowContracts";
import type { TFile, Vault } from "obsidian";

const ASSIGNMENT_COACH_SCOPE_NOTICE = "Open an assignment note before running Assignment Coach.";
const ASSIGNMENT_PATH_PREFIX = "PBG/Assignments/";

export interface AssignmentCoachClient {
  runAssignmentCoach(payload: AssignmentCoachRunRequest): Promise<AssignmentCoachRunResponse>;
}

export async function runAssignmentCoachForFile(input: {
  file: TFile;
  vault: Vault;
  client: AssignmentCoachClient;
}): Promise<string> {
  if (!isAssignmentCoachFile(input.file)) {
    throw new Error(ASSIGNMENT_COACH_SCOPE_NOTICE);
  }

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

export function getAssignmentCoachScopeNotice(): string {
  return ASSIGNMENT_COACH_SCOPE_NOTICE;
}

export function isAssignmentCoachFile(file: Pick<TFile, "path">): boolean {
  const path = normalizeVaultPath(file.path);
  return path.startsWith(ASSIGNMENT_PATH_PREFIX) && path.endsWith(".md");
}

function normalizeVaultPath(path: string): string {
  const normalized = path.replace(/\\/g, "/").replace(/^\/+/, "");
  const segments = normalized.split("/");

  if (segments.some((segment) => !segment || segment === "." || segment === "..")) {
    return "";
  }

  return segments.join("/");
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
  const frontmatter = markdown.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!frontmatter?.[1]) {
    return false;
  }

  const lines = frontmatter[1].split(/\r?\n/);
  for (let index = 0; index < lines.length; index += 1) {
    const currentLine = lines[index];
    if (currentLine === undefined) {
      continue;
    }

    const tagsLine = currentLine.match(/^\s*tags:\s*(.*)$/i);
    if (!tagsLine) {
      continue;
    }

    const inlineValue = (tagsLine[1] ?? "").trim();
    if (inlineValue && yamlTagValueIncludesAcademy(inlineValue)) {
      return true;
    }

    for (let listIndex = index + 1; listIndex < lines.length; listIndex += 1) {
      const line = lines[listIndex];
      if (line === undefined) {
        break;
      }

      if (!/^\s+/.test(line)) {
        break;
      }

      const listItem = line.match(/^\s*-\s*(.+?)\s*$/);
      if (listItem?.[1] && yamlTagValueIncludesAcademy(listItem[1])) {
        return true;
      }
    }
  }

  return false;
}

function yamlTagValueIncludesAcademy(value: string): boolean {
  return value
    .replace(/^\[/, "")
    .replace(/\]$/, "")
    .split(",")
    .map((tag) => tag.trim().replace(/^['"]|['"]$/g, ""))
    .some((tag) => tag === "academy");
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
