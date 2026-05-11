import type { TextDiffPreview } from "../types";

export type InlineDiffWorkflowAction = "accept" | "change" | "reject" | "undo";

export interface InlineDiffActionButton {
  action: InlineDiffWorkflowAction;
  label: string;
  primary: boolean;
}

export interface InlineDiffWorkflowState {
  title: string;
  path: string;
  status: TextDiffPreview["status"];
  canApply: boolean;
  canUndo: boolean;
  buttons: InlineDiffActionButton[];
}

export function buildInlineDiffWorkflowState(
  preview: TextDiffPreview
): InlineDiffWorkflowState {
  return {
    title: preview.title,
    path: preview.sourcePath,
    status: preview.status,
    canApply: preview.status === "pending",
    canUndo: preview.status === "applied",
    buttons: getInlineDiffActionButtons(preview.status)
  };
}

export function getInlineDiffActionButtons(
  status: TextDiffPreview["status"]
): InlineDiffActionButton[] {
  if (status === "pending") {
    return [
      { action: "accept", label: "Accept", primary: true },
      { action: "change", label: "Change", primary: false },
      { action: "reject", label: "Reject", primary: false }
    ];
  }

  if (status === "applied") {
    return [{ action: "undo", label: "Undo", primary: false }];
  }

  return [];
}
