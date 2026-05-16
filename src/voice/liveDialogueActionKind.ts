import type { LiveDialogueAcknowledgementKind } from "./liveDialogue";

export interface LiveDialogueActionLike {
  kind: string;
  actions?: LiveDialogueActionLike[];
}

export function getLiveDialogueAcknowledgementKindForAction(
  action: LiveDialogueActionLike
): LiveDialogueAcknowledgementKind {
  if (action.kind === "action-plan") {
    return (
      action.actions
        ?.map((step) => getLiveDialogueAcknowledgementKindForAction(step))
        .find((kind) => Boolean(kind)) ?? "thinking"
    );
  }

  switch (action.kind) {
    case "open-file":
    case "open-last-file":
      return "opening";
    case "research-web":
    case "research-note":
    case "semantic-vault":
    case "search-vault":
      return "researching";
    case "replace-text":
    case "replace-multiple":
    case "replace-selection-or-line":
    case "apply-diff":
    case "reject-diff":
    case "refine-diff":
    case "undo-diff":
    case "improve-selection":
    case "create-note":
    case "note-action":
      return "editing";
    case "attach-last-results":
    case "read-last-answer":
    case "stop-speaking":
    case "summarize-last-file":
    default:
      return "thinking";
  }
}
