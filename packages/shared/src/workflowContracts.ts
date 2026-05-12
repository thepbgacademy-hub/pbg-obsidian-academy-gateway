export interface AssignmentCoachContextItem {
  path: string;
  title: string;
  body: string;
}

export interface AssignmentCoachRunRequest {
  assignmentPath: string;
  assignmentTitle: string;
  assignmentBody: string;
  relatedContext: AssignmentCoachContextItem[];
  localMetadata: {
    taskCount: number;
    completedTaskCount: number;
    tags: string[];
  };
}

export interface AssignmentCoachRunResponse {
  runId: string;
  status: "completed";
  creditCost: number;
  result: {
    title: string;
    summary: string;
    nextSteps: string[];
    markdown: string;
  };
}

export interface AssignmentCoachPreviewResponse {
  status: "preview";
  assignmentPath: string;
  assignmentTitle: string;
  summary: string;
  contextCount: number;
  taskCount: number;
  completedTaskCount: number;
}
