import type { ActionReceipt } from "../../types";
import type { LiveDialogueAcknowledgementKind } from "../../voice/liveDialogue";
import { getLiveDialogueAcknowledgementKindForAction } from "../../voice/liveDialogueActionKind";
import type { LocalCommandAction } from "../sidebarTypes";

export interface LocalCommandRuntimeControllerDeps {
  resolveLocalCommandAction: (
    trimmedText: string
  ) => Promise<LocalCommandAction | null>;
  executeLocalCommandAction: (action: LocalCommandAction) => Promise<void>;
  getMessageCount: () => number;
  getErrorMessage: () => string;
  isLiveDialogueSessionActive: () => boolean;
  playLiveDialogueAcknowledgement: (
    kind: LiveDialogueAcknowledgementKind
  ) => void | Promise<void>;
  appendActionReceipt: (receipt: ActionReceipt, commandText: string) => void;
  setStatus: (status: string) => void;
  shouldPreventChatFallback: (text: string) => boolean;
  normalizeCommandText: (text: string) => string;
  getEffectiveCommandText: (text: string) => string;
}

export class LocalCommandRuntimeController {
  constructor(private readonly deps: LocalCommandRuntimeControllerDeps) {}

  async handle(text: string): Promise<boolean> {
    const trimmedText = text.trim();

    if (!trimmedText) {
      return false;
    }

    const action = await this.deps.resolveLocalCommandAction(trimmedText);

    if (!action) {
      return this.handleUnresolvedCommand(trimmedText);
    }

    const liveAcknowledgementKind = this.deps.isLiveDialogueSessionActive()
      ? getLiveDialogueAcknowledgementKindForAction(action)
      : null;

    if (liveAcknowledgementKind) {
      void this.deps.playLiveDialogueAcknowledgement(liveAcknowledgementKind);
    }

    const messageCountBeforeAction = this.deps.getMessageCount();
    await this.deps.executeLocalCommandAction(action);
    const errorMessage = this.deps.getErrorMessage();

    if (this.deps.getMessageCount() === messageCountBeforeAction && errorMessage) {
      this.deps.appendActionReceipt(
        {
          status: "failed",
          label: "Action failed",
          detail: errorMessage
        },
        trimmedText
      );
    }

    return true;
  }

  private handleUnresolvedCommand(trimmedText: string): boolean {
    const commandText = this.deps.normalizeCommandText(trimmedText);
    const effectiveCommandText = this.deps.getEffectiveCommandText(commandText);

    if (
      this.deps.shouldPreventChatFallback(commandText) ||
      this.deps.shouldPreventChatFallback(effectiveCommandText)
    ) {
      this.deps.appendActionReceipt(
        {
          status: "failed",
          label: "Action not resolved",
          detail:
            "I understood this as a vault action, but could not safely resolve the exact file, note, or edit target."
        },
        trimmedText
      );
      this.deps.setStatus("Status: Action not resolved");
      return true;
    }

    return false;
  }
}
