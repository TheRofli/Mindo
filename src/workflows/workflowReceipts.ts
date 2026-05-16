import type { ContexActionReceipt } from "../actions/actionTypes";
import type { WorkflowSourceRef } from "./workflowTypes";

export function formatCompactWorkflowReceipts(
  receipts: ContexActionReceipt[]
): string {
  return receipts
    .filter((receipt) => receipt.kind !== "none")
    .map((receipt) => `${statusToVerb(receipt)}${receipt.path ? ` · ${receipt.path}` : ""}`)
    .join("\n");
}

export function collapseWorkflowSources(
  sources: WorkflowSourceRef[],
  visibleLimit = 2
): {
  label: string;
  visible: WorkflowSourceRef[];
  hiddenCount: number;
} {
  const visible = sources.slice(0, visibleLimit);

  return {
    label: `${sources.length} ${sources.length === 1 ? "source" : "sources"}`,
    visible,
    hiddenCount: Math.max(0, sources.length - visible.length)
  };
}

function statusToVerb(receipt: ContexActionReceipt): string {
  if (receipt.status === "opened") return "Opened";
  if (receipt.status === "saved") return "Created";
  if (receipt.status === "applied") return "Edited";
  if (receipt.status === "reverted") return "Undone";
  if (receipt.status === "done") return "Done";
  if (receipt.status === "preview") return "Preview";
  if (receipt.status === "failed") return "Failed";

  return receipt.label;
}
