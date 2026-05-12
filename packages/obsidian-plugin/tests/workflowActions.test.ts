import { describe, expect, it } from "vitest";
import type { AssignmentCoachRunRequest, AssignmentCoachRunResponse } from "@pbg/shared/workflowContracts";
import type { TFile, Vault } from "obsidian";
import { runAssignmentCoachForFile } from "../src/workflowActions.js";

type FakeFile = {
  path: string;
  basename: string;
};

class FakeVault {
  readonly files = new Map<string, string>();
  readonly folders = new Set<string>();
  readonly createdFiles: Array<{ path: string; body: string }> = [];
  readonly createdFolders: string[] = [];

  async read(file: FakeFile): Promise<string> {
    const body = this.files.get(file.path);
    if (body === undefined) {
      throw new Error(`Missing fake file: ${file.path}`);
    }

    return body;
  }

  getAbstractFileByPath(path: string): unknown {
    if (this.files.has(path)) {
      return { path, type: "file" };
    }

    if (this.folders.has(path)) {
      return { path, children: [] };
    }

    return null;
  }

  async createFolder(path: string): Promise<void> {
    this.folders.add(path);
    this.createdFolders.push(path);
  }

  async create(path: string, body: string): Promise<void> {
    if (this.files.has(path)) {
      throw new Error(`Already exists: ${path}`);
    }

    this.files.set(path, body);
    this.createdFiles.push({ path, body });
  }
}

class FakeClient {
  readonly requests: AssignmentCoachRunRequest[] = [];

  async runAssignmentCoach(payload: AssignmentCoachRunRequest): Promise<AssignmentCoachRunResponse> {
    this.requests.push(payload);

    return {
      runId: "run-001",
      status: "completed",
      creditCost: 1,
      result: {
        title: "Assignment Coach Result",
        summary: "Ready",
        nextSteps: ["Ship it"],
        markdown: "# Assignment Coach Result\n"
      }
    };
  }
}

describe("runAssignmentCoachForFile", () => {
  it("sends active assignment content only when the explicit helper is called and saves the result", async () => {
    const vault = new FakeVault();
    const client = new FakeClient();
    const file = {
      path: "PBG/Assignments/connect-first-workflow.md",
      basename: "connect-first-workflow"
    };
    vault.folders.add("PBG");
    vault.files.set(
      file.path,
      [
        "---",
        "type: assignment",
        "tags:",
        "  - academy",
        "---",
        "# Connect First Workflow",
        "",
        "- [ ] Open the dashboard",
        "- [x] Sync course manifest"
      ].join("\n")
    );

    expect(client.requests).toEqual([]);

    const resultPath = await runAssignmentCoachForFile({
      file: file as TFile,
      vault: vault as unknown as Vault,
      client
    });

    expect(client.requests).toEqual([
      {
        assignmentPath: "PBG/Assignments/connect-first-workflow.md",
        assignmentTitle: "connect-first-workflow",
        assignmentBody: vault.files.get(file.path),
        relatedContext: [],
        localMetadata: {
          taskCount: 2,
          completedTaskCount: 1,
          tags: ["academy"]
        }
      }
    ]);
    expect(resultPath).toBe("PBG/Workflow Results/run-001.md");
    expect(vault.createdFolders).toEqual(["PBG/Workflow Results"]);
    expect(vault.createdFiles).toEqual([
      {
        path: "PBG/Workflow Results/run-001.md",
        body: "# Assignment Coach Result\n"
      }
    ]);
  });

  it("uses a suffix when the default result path already exists", async () => {
    const vault = new FakeVault();
    const client = new FakeClient();
    const file = {
      path: "PBG/Assignments/connect-first-workflow.md",
      basename: "connect-first-workflow"
    };
    vault.folders.add("PBG/Workflow Results");
    vault.files.set(file.path, "# Connect First Workflow\n- [ ] Run Assignment Coach\n");
    vault.files.set("PBG/Workflow Results/run-001.md", "Existing result");

    const resultPath = await runAssignmentCoachForFile({
      file: file as TFile,
      vault: vault as unknown as Vault,
      client
    });

    expect(resultPath).toBe("PBG/Workflow Results/run-001-1.md");
    expect(vault.createdFiles.at(-1)).toEqual({
      path: "PBG/Workflow Results/run-001-1.md",
      body: "# Assignment Coach Result\n"
    });
  });
});
