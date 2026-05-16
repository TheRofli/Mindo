import { buildWikiAutopilotAction, decideWikiAutopilot } from "../wiki/wikiAutopilot";
import type { WikiUpdateAction } from "../actions/actionTypes";
import type { WorkflowRoute } from "./workflowTypes";
import type { ContexActionReceipt } from "../actions/actionTypes";

export function buildWorkflowMemoryAction(input: {
  route: WorkflowRoute;
  receipts: ContexActionReceipt[];
  assistantText?: string;
}): WikiUpdateAction | null {
  const sourcePaths = input.receipts
    .map((receipt) => receipt.path)
    .filter((path): path is string => Boolean(path));
  const decision = decideWikiAutopilot({
    userText: input.route.userText,
    assistantText: input.assistantText,
    receipts: input.receipts,
    sourcePaths,
    now: new Date().toISOString()
  });

  return buildWikiAutopilotAction(decision, {
    userText: input.route.userText,
    sourceActionIds: input.receipts.map((receipt) => receipt.actionId)
  });
}
