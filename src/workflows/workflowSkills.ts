import type { WorkflowDefinition } from "./workflowTypes";
import { getWorkflowRegistry } from "./workflowRegistry";

export function getBuiltInWorkflowSkills(): WorkflowDefinition[] {
  return getWorkflowRegistry().filter(
    (workflow) => workflow.id !== "chat" && workflow.id !== "delete_or_move"
  );
}
