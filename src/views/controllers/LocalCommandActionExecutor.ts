import type { SelectedTextContext } from "../../types";
import type {
  LocalCommandAction,
  VoiceTextReplacement
} from "../sidebarTypes";

export interface LocalCommandActionExecutorHandlers {
  previewTextReplacement: (
    commandText: string,
    replacement: VoiceTextReplacement
  ) => Promise<unknown>;
  previewMultiTextReplacement: (
    commandText: string,
    replacements: VoiceTextReplacement[]
  ) => Promise<unknown>;
  previewSelectionOrLineReplacement: (
    commandText: string,
    replacement: string
  ) => Promise<unknown>;
  applyDiffPreview: (messageId: string) => Promise<unknown>;
  rejectDiffPreview: (messageId: string) => void;
  refineDiffPreview: (
    messageId: string,
    instruction: string
  ) => Promise<unknown>;
  undoDiffPreview: (messageId: string) => Promise<unknown>;
  readSelectedTextContextForVoice: () => {
    context: SelectedTextContext | null;
    warning: string | null;
  };
  sendSelectedTextImprovement: (
    context: SelectedTextContext
  ) => Promise<unknown>;
  openLastFoundFile: (commandText?: string) => Promise<unknown>;
  openFileByVaultQuery: (
    query: string,
    commandText: string
  ) => Promise<unknown>;
  sendVaultSearch: (query: string) => Promise<unknown>;
  sendSemanticVaultQuestion: (query: string) => Promise<unknown>;
  sendWebResearch: (query: string) => Promise<unknown>;
  createResearchNote: (
    commandText: string,
    displayText: string
  ) => Promise<unknown>;
  answerFromLastFoundFile: (commandText: string) => Promise<unknown>;
  attachLastFoundFiles: () => void;
  createNote: (commandText: string, displayText: string) => Promise<unknown>;
  speakLatestAssistantMessage: () => Promise<unknown>;
  stopSpeaking: () => void;
  rememberCurrentNote: () => Promise<unknown>;
  createRoadmapFromCurrentNote: () => Promise<unknown>;
  saveCurrentChatAsNote: () => Promise<unknown>;
  updateCurrentNote: (commandText: string) => Promise<unknown>;
  setError: (message: string | null) => void;
  getErrorMessage: () => string;
  setStatus: (status: string) => void;
  renderMessages: () => Promise<unknown>;
}

export class LocalCommandActionExecutor {
  constructor(private readonly handlers: LocalCommandActionExecutorHandlers) {}

  async execute(action: LocalCommandAction): Promise<void> {
    switch (action.kind) {
      case "action-plan":
        await this.executePlan(action);
        return;
      case "replace-text":
        await this.handlers.previewTextReplacement(
          action.commandText,
          action.replacement
        );
        return;
      case "replace-multiple":
        await this.handlers.previewMultiTextReplacement(
          action.commandText,
          action.replacements
        );
        return;
      case "replace-selection-or-line":
        await this.handlers.previewSelectionOrLineReplacement(
          action.commandText,
          action.suggested
        );
        return;
      case "apply-diff":
        await this.handlers.applyDiffPreview(action.messageId);
        return;
      case "reject-diff":
        this.handlers.rejectDiffPreview(action.messageId);
        return;
      case "refine-diff":
        await this.handlers.refineDiffPreview(
          action.messageId,
          action.instruction
        );
        return;
      case "undo-diff":
        await this.handlers.undoDiffPreview(action.messageId);
        return;
      case "improve-selection": {
        const contextResult = this.handlers.readSelectedTextContextForVoice();

        if (!contextResult.context) {
          this.handlers.setError(contextResult.warning);
          this.handlers.setStatus("Status: No selected text");
          return;
        }

        await this.handlers.sendSelectedTextImprovement(contextResult.context);
        return;
      }
      case "open-last-file":
        await this.handlers.openLastFoundFile(action.commandText);
        return;
      case "open-file":
        await this.handlers.openFileByVaultQuery(
          action.query,
          action.commandText
        );
        return;
      case "search-vault":
        await this.handlers.sendVaultSearch(action.query);
        return;
      case "semantic-vault":
        await this.handlers.sendSemanticVaultQuestion(action.query);
        return;
      case "research-web":
        await this.handlers.sendWebResearch(action.query);
        return;
      case "research-note":
        await this.handlers.createResearchNote(
          action.commandText,
          action.displayText ?? action.commandText
        );
        return;
      case "summarize-last-file":
        await this.handlers.answerFromLastFoundFile(action.commandText);
        return;
      case "attach-last-results":
        this.handlers.attachLastFoundFiles();
        return;
      case "create-note":
        await this.handlers.createNote(
          action.commandText,
          action.displayText ?? action.commandText
        );
        return;
      case "read-last-answer":
        await this.handlers.speakLatestAssistantMessage();
        return;
      case "stop-speaking":
        this.handlers.stopSpeaking();
        this.handlers.setStatus("Status: Ready");
        void this.handlers.renderMessages();
        return;
      case "note-action":
        await this.executeNoteAction(action);
        return;
    }
  }

  private async executePlan(
    plan: Extract<LocalCommandAction, { kind: "action-plan" }>
  ): Promise<void> {
    for (let index = 0; index < plan.actions.length; index += 1) {
      const action = plan.actions[index];

      this.handlers.setStatus(
        `Status: Running step ${index + 1}/${plan.actions.length}`
      );
      await this.execute(action);

      if (this.handlers.getErrorMessage()) {
        break;
      }
    }
  }

  private async executeNoteAction(
    action: Extract<LocalCommandAction, { kind: "note-action" }>
  ): Promise<void> {
    if (action.action === "remember") {
      await this.handlers.rememberCurrentNote();
    } else if (action.action === "roadmap") {
      await this.handlers.createRoadmapFromCurrentNote();
    } else if (action.action === "chat-note") {
      await this.handlers.saveCurrentChatAsNote();
    } else {
      await this.handlers.updateCurrentNote(action.commandText);
    }
  }
}
