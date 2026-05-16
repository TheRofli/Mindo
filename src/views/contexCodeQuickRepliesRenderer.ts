import {
  getContexCodePlanningQuestion,
  getContexCodePlanningQuickOptions,
  type ContexCodePlanningQuickOption
} from "../contexCode";
import type { UiLanguage } from "../i18n";
import type { ChatMessage } from "../types";
import type { PendingContexCodeInterviewState } from "./controllers/ContexCodeWorkflowController";

export interface ContexCodeQuickRepliesInput {
  pending: PendingContexCodeInterviewState | null;
  messageId: string;
  uiLanguage: UiLanguage;
}

export function getContexCodeQuickReplies(
  input: ContexCodeQuickRepliesInput
): ContexCodePlanningQuickOption[] {
  const { pending, messageId, uiLanguage } = input;

  if (!pending || pending.questionMessageId !== messageId) {
    return [];
  }

  const question = getContexCodePlanningQuestion(
    pending.interview,
    pending.currentQuestionIndex
  );

  if (!question) {
    return [];
  }

  return getContexCodePlanningQuickOptions(question, uiLanguage);
}

export interface ContexCodeQuickRepliesRendererDeps {
  getPendingInterview: () => PendingContexCodeInterviewState | null;
  getUiLanguage: () => UiLanguage;
  onSubmit: (value: string) => void;
}

export class ContexCodeQuickRepliesRenderer {
  constructor(private readonly deps: ContexCodeQuickRepliesRendererDeps) {}

  render(messageEl: HTMLElement, message: ChatMessage): void {
    const options = getContexCodeQuickReplies({
      pending: this.deps.getPendingInterview(),
      messageId: message.id,
      uiLanguage: this.deps.getUiLanguage()
    });

    if (!options.length) {
      return;
    }

    const repliesEl = messageEl.createDiv({
      cls: "contex-agent__quick-replies"
    });

    for (const option of options) {
      const button = repliesEl.createEl("button", {
        cls: "contex-agent__quick-reply",
        text: option.label,
        attr: {
          type: "button",
          "aria-label": option.value
        }
      });
      button.addEventListener("click", () => {
        this.deps.onSubmit(option.value);
      });
    }
  }
}
