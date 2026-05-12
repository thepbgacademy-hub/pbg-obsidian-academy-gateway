import Fastify, { type FastifyInstance } from "fastify";
import { API_ROUTES } from "@pbg/shared/contracts";
import { createPocCourseManifest } from "@pbg/shared/courseManifest";
import type {
  AssignmentCoachRunRequest,
  AssignmentCoachRunResponse
} from "@pbg/shared/workflowContracts";

const POC_ASSIGNMENT_COACH_RUN_ID = "poc-assignment-coach-run";

export function buildApp(): FastifyInstance {
  const app = Fastify({
    logger: false
  });

  app.get(API_ROUTES.courseManifest, async () => createPocCourseManifest());

  app.post<{ Body: AssignmentCoachRunRequest }>(
    API_ROUTES.assignmentCoachRun,
    async (request): Promise<AssignmentCoachRunResponse> => {
      const taskCount = request.body.localMetadata.taskCount;

      return {
        runId: POC_ASSIGNMENT_COACH_RUN_ID,
        status: "completed",
        creditCost: 1,
        result: {
          title: `Assignment Coach: ${request.body.assignmentTitle}`,
          summary: `Reviewed ${taskCount} task${taskCount === 1 ? "" : "s"} for ${request.body.assignmentPath}.`,
          nextSteps: [
            `Open ${request.body.assignmentPath} in Obsidian.`,
            "Complete the next unchecked task.",
            "Sync progress back through the gateway when ready."
          ],
          markdown:
            `# Assignment Coach: ${request.body.assignmentTitle}\n\n` +
            `Run ID: ${POC_ASSIGNMENT_COACH_RUN_ID}\n\n` +
            `Reviewed ${request.body.assignmentPath} with ${taskCount} task${taskCount === 1 ? "" : "s"}.\n\n` +
            "## Next Steps\n\n" +
            `1. Open ${request.body.assignmentPath} in Obsidian.\n` +
            "2. Complete the next unchecked task.\n" +
            "3. Sync progress back through the gateway when ready.\n"
        }
      };
    }
  );

  return app;
}
