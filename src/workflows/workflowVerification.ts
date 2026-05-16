import type { ContexActionReceipt } from "../actions/actionTypes";
import type { WorkflowRoute, WorkflowVerificationResult } from "./workflowTypes";

const REQUIRED_SUCCESS: Record<string, Set<string>> = {
  open_note: new Set(["opened"]),
  create_note: new Set(["saved"]),
  research_note: new Set(["saved"]),
  replace_text: new Set(["preview", "applied"]),
  replace_selection: new Set(["preview", "applied"]),
  apply_diff: new Set(["applied"]),
  reject_diff: new Set(["rejected"]),
  undo_change: new Set(["reverted", "done"]),
  search_web: new Set(["done"]),
  search_vault: new Set(["done"]),
  update_wiki: new Set(["preview", "done"]),
  update_note: new Set(["preview", "applied", "done"]),
  read_answer: new Set(["done"]),
  attach_file: new Set(["done"]),
  none: new Set(["done", "failed"])
};

export function verifyWorkflowReceipts(
  route: WorkflowRoute,
  receipts: ContexActionReceipt[]
): WorkflowVerificationResult {
  const errors: string[] = [];

  route.actions.forEach((action) => {
    if (action.kind === "none") {
      return;
    }

    const receipt = receipts.find((item) => item.actionId === action.id);
    const validStatuses = REQUIRED_SUCCESS[action.kind] ?? new Set(["done"]);

    if (!receipt) {
      errors.push(`Missing receipt for ${action.kind}.`);
      return;
    }

    if (!validStatuses.has(receipt.status)) {
      errors.push(`${action.kind} did not complete: ${receipt.status}.`);
    }

    if (
      (action.kind === "open_note" ||
        action.kind === "create_note" ||
        action.kind === "research_note") &&
      !receipt.path
    ) {
      errors.push(`${action.kind} completed without a verified path.`);
    }
  });

  return {
    ok: errors.length === 0,
    errors
  };
}
