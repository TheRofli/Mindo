import {
  buildPromptImprovementMessages,
  cleanImprovedPrompt
} from "../../prompt/promptImprover";
import type {
  ChatMessage,
  ContexSettings,
  LlmRequestContext
} from "../../types";
import type { ActionTimelineEventType } from "../../actions/actionTimeline";

export interface PromptImproverControllerDeps {
  settings: ContexSettings;
  getPrompt: () => string;
  setPrompt: (value: string) => void;
  setInputDisabled: (value: boolean) => void;
  focusInput: () => void;
  requestLlmChatCompletion: (
    settings: ContexSettings,
    messages: ChatMessage[],
    context?: LlmRequestContext | null
  ) => Promise<string>;
  setError: (message: string | null) => void;
  setLoading: (loading: boolean) => void;
  setStatus: (status: string) => void;
  pushActionTimeline: (
    type: ActionTimelineEventType,
    label: string,
    detail?: string
  ) => void;
  notify: (message: string) => void;
  getErrorMessage: (error: unknown) => string;
}

export class PromptImproverController {
  constructor(private readonly deps: PromptImproverControllerDeps) {}

  async improve(): Promise<void> {
    const originalPrompt = this.deps.getPrompt().trim();

    if (!originalPrompt) {
      this.deps.notify("Write a prompt first.");
      return;
    }

    this.deps.setError(null);
    this.deps.setStatus("Status: Improving prompt");
    this.deps.pushActionTimeline("running", "Improving prompt");
    this.deps.setLoading(true);

    try {
      const improvedPrompt = cleanImprovedPrompt(
        await this.deps.requestLlmChatCompletion(
          this.deps.settings,
          buildPromptImprovementMessages(originalPrompt),
          null
        )
      );

      if (!improvedPrompt) {
        throw new Error("The model returned an empty improved prompt.");
      }

      this.deps.setPrompt(improvedPrompt);
      this.deps.setStatus("Status: Prompt improved");
      this.deps.pushActionTimeline("done", "Prompt improved");
    } catch (error) {
      const message = this.deps.getErrorMessage(error);
      this.deps.setError(message);
      this.deps.setStatus("Status: Prompt improvement failed");
      this.deps.pushActionTimeline(
        "failed",
        "Prompt improvement failed",
        message
      );
    } finally {
      this.deps.setLoading(false);
      this.deps.setInputDisabled(false);
      this.deps.focusInput();
    }
  }
}
