import type {
  ContexActionPlan,
  ContexActionReceipt
} from "../actions/actionTypes";
import {
  executeContexActionPlan,
  type ContexActionExecutorOps
} from "../actions/actionExecutor";
import { workflowRouteToActionPlan } from "./workflowRouter";
import { verifyWorkflowReceipts } from "./workflowVerification";
import type { WorkflowRoute, WorkflowRunResult } from "./workflowTypes";

export interface WorkflowRuntimeOps {
  executePlan?: (plan: ContexActionPlan) => Promise<ContexActionReceipt[]>;
  actionExecutorOps?: ContexActionExecutorOps;
}

export async function runWorkflow(
  route: WorkflowRoute,
  ops: WorkflowRuntimeOps
): Promise<WorkflowRunResult> {
  const plan = workflowRouteToActionPlan(route);
  const receipts = ops.executePlan
    ? await ops.executePlan(plan)
    : await executeContexActionPlan(plan, ops.actionExecutorOps ?? {});
  const verification = verifyWorkflowReceipts(route, receipts);

  return {
    id: route.id,
    status: verification.ok ? "complete" : "failed",
    receipts,
    verification
  };
}
