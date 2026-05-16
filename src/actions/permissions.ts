import type { ContexAction } from "./actionTypes";

export type ActionPermissionMode = "immediate" | "confirm" | "unsupported";

export interface ActionPermissionDecision {
  mode: ActionPermissionMode;
  reason: string;
}

const IMMEDIATE_ACTIONS = new Set([
  "open_note",
  "create_note",
  "replace_text",
  "replace_selection",
  "apply_diff",
  "reject_diff",
  "undo_change",
  "search_vault",
  "search_web",
  "research_note",
  "update_wiki",
  "update_note",
  "read_answer",
  "attach_file"
]);

export function classifyActionPermission(
  action: ContexAction
): ActionPermissionDecision {
  if (IMMEDIATE_ACTIONS.has(action.kind)) {
    return {
      mode: "immediate",
      reason: `${action.kind} is a non-destructive Mindo action.`
    };
  }

  return {
    mode: "unsupported",
    reason: `${action.kind} is not supported by the current executor.`
  };
}
