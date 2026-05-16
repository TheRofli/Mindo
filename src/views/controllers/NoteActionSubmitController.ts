import type {
  CurrentNoteContext,
  LlmRequestContext,
  SelectedTextContext
} from "../../types";
import {
  SELECTED_TEXT_ACTIONS,
  type NoteAction
} from "../noteActions";

interface SendMessageOptions {
  diffPreviewOriginal?: string;
  diffPreviewTitle?: string;
  diffOperationType?: string;
  diffUserPrompt?: string;
  allowWhileLoading?: boolean;
}

interface CurrentNoteContextResult {
  context: CurrentNoteContext | null;
}

interface SelectedTextContextResult {
  context: SelectedTextContext | null;
  warning: string | null;
}

export interface NoteActionSubmitControllerDeps {
  isLoading: () => boolean;
  readCurrentNoteContextForRequest: () => Promise<CurrentNoteContextResult>;
  readSelectedTextContextForRequest: () => SelectedTextContextResult;
  setError: (message: string | null) => void;
  setStatus: (status: string) => void;
  setUseCurrentNote: (value: boolean) => void;
  refreshContextStatus: () => void;
  sendMessage: (
    content: string | undefined,
    context: LlmRequestContext | null,
    clearInput?: boolean,
    options?: SendMessageOptions
  ) => Promise<void>;
  hideSelectionToolbar: () => void;
}

export class NoteActionSubmitController {
  constructor(private readonly deps: NoteActionSubmitControllerDeps) {}

  async sendNoteAction(prompt: string): Promise<void> {
    if (this.deps.isLoading()) {
      return;
    }

    const contextResult = await this.deps.readCurrentNoteContextForRequest();

    if (!contextResult.context) {
      this.deps.setError("Open a Markdown note before using note actions.");
      this.deps.setStatus("Status: No current note");
      return;
    }

    this.deps.setUseCurrentNote(true);
    this.deps.refreshContextStatus();

    await this.deps.sendMessage(
      prompt,
      { currentNote: contextResult.context },
      false
    );
  }

  async sendSelectedTextAction(
    prompt: string,
    selectedTextContextOverride?: SelectedTextContext | null
  ): Promise<void> {
    if (this.deps.isLoading()) {
      return;
    }

    const contextResult = this.getSelectedTextContextResult(
      selectedTextContextOverride
    );

    if (!contextResult.context) {
      this.deps.setError(contextResult.warning);
      this.deps.setStatus("Status: No selected text");
      return;
    }

    await this.deps.sendMessage(
      prompt,
      { selectedText: contextResult.context },
      false
    );
    this.deps.hideSelectionToolbar();
  }

  async sendSelectedTextImprovement(
    selectedTextContextOverride?: SelectedTextContext | null
  ): Promise<void> {
    const action = SELECTED_TEXT_ACTIONS.find(
      (selectedAction) => selectedAction.kind === "improve-selection"
    );

    await this.sendSelectedTextDiffAction(
      action,
      selectedTextContextOverride,
      "Improve selection preview",
      "improve-selection",
      { allowWhileLoading: true }
    );
  }

  async sendSelectedTextDiffAction(
    action: NoteAction | undefined,
    selectedTextContextOverride: SelectedTextContext | null | undefined,
    previewTitle: string,
    operationType: string,
    options: { allowWhileLoading?: boolean } = {}
  ): Promise<void> {
    if (this.deps.isLoading() && !options.allowWhileLoading) {
      return;
    }

    const contextResult = this.getSelectedTextContextResult(
      selectedTextContextOverride
    );

    if (!action || !contextResult.context) {
      this.deps.setError(
        contextResult.warning ?? "Select text before using this action."
      );
      this.deps.setStatus("Status: No selected text");
      return;
    }

    await this.deps.sendMessage(
      action.prompt,
      { selectedText: contextResult.context },
      false,
      {
        diffPreviewOriginal: contextResult.context.text,
        diffPreviewTitle: previewTitle,
        diffOperationType: operationType,
        diffUserPrompt: action.prompt
      }
    );
    this.deps.hideSelectionToolbar();
  }

  private getSelectedTextContextResult(
    selectedTextContextOverride?: SelectedTextContext | null
  ): SelectedTextContextResult {
    if (selectedTextContextOverride) {
      return {
        context: selectedTextContextOverride,
        warning: null
      };
    }

    return this.deps.readSelectedTextContextForRequest();
  }
}
