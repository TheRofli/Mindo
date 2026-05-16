import { isLiveStopOnlyCommand } from "../../voice/liveDialogue";
import { getBestTranscribedText } from "../../voice/transcribedTextResolver";

export interface TranscribedTextControllerDeps {
  getInputEl: () => HTMLTextAreaElement | null;
  getLiveTranscriptBaseText: () => string;
  getLiveTranscriptLastPreview: () => string;
  refreshLiveDialogueSurface: () => void;
  sendUserMessage: (options?: { liveDialogue?: boolean }) => Promise<void>;
  setStatus: (status: string) => void;
  setContextDetail: (message: string | null, isWarning: boolean) => void;
  clearLiveTranscriptPreviewState: () => void;
  startLiveDialogueListening: () => Promise<void>;
}

export type TranscribedTextSendResult = "empty" | "sent" | "stopped";

export class TranscribedTextController {
  constructor(private readonly deps: TranscribedTextControllerDeps) {}

  append(text: string): boolean {
    const inputEl = this.deps.getInputEl();
    const trimmedText = this.resolveText(text, false);

    if (!trimmedText || !inputEl) {
      return false;
    }

    const currentValue =
      this.deps.getLiveTranscriptBaseText() || inputEl.value.trim();

    inputEl.value = currentValue
      ? `${currentValue} ${trimmedText}`
      : trimmedText;
    inputEl.focus();
    this.deps.refreshLiveDialogueSurface();

    return true;
  }

  async send(
    text: string,
    options?: { liveDialogue?: boolean }
  ): Promise<TranscribedTextSendResult> {
    const inputEl = this.deps.getInputEl();
    const trimmedText = this.resolveText(text, true);

    if (!trimmedText || !inputEl) {
      return "empty";
    }

    if (options?.liveDialogue && isLiveStopOnlyCommand(trimmedText)) {
      inputEl.value = "";
      this.deps.setStatus("Status: Live Dialogue interrupted");
      this.deps.setContextDetail("Live interruption: stopped", false);
      this.deps.clearLiveTranscriptPreviewState();
      await this.deps.startLiveDialogueListening();
      return "stopped";
    }

    inputEl.value = trimmedText;
    await this.deps.sendUserMessage(options);
    return "sent";
  }

  private resolveText(text: string, includeLiveBase: boolean): string {
    return getBestTranscribedText({
      finalTranscription: text,
      liveTranscriptBaseText: this.deps.getLiveTranscriptBaseText(),
      liveTranscriptLastPreview: this.deps.getLiveTranscriptLastPreview(),
      includeLiveBase
    });
  }
}
