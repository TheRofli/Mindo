import { buildLiveTranscriptValue } from "../../voice/liveTranscript";

export interface LiveTranscriptDraftControllerDeps {
  refreshLiveDialogueSurface: () => void;
}

export class LiveTranscriptDraftController {
  private baseText = "";
  private lastPreview = "";

  constructor(private readonly deps: LiveTranscriptDraftControllerDeps) {}

  begin(inputEl: HTMLTextAreaElement | null): boolean {
    if (!inputEl) {
      return false;
    }

    this.baseText = inputEl.value.trim();
    this.lastPreview = this.baseText;

    return true;
  }

  update(
    inputEl: HTMLTextAreaElement | null,
    finalText: string,
    interimText: string
  ): boolean {
    if (!inputEl) {
      return false;
    }

    const nextValue = buildLiveTranscriptValue(
      this.baseText,
      interimText,
      finalText
    );

    if (!nextValue) {
      return false;
    }

    this.lastPreview = nextValue;
    inputEl.value = nextValue;
    inputEl.scrollTop = inputEl.scrollHeight;
    this.deps.refreshLiveDialogueSurface();

    return true;
  }

  clear(): void {
    this.baseText = "";
    this.lastPreview = "";
  }

  restore(inputEl: HTMLTextAreaElement | null): void {
    if (inputEl) {
      inputEl.value = this.baseText;
    }
  }

  getBaseText(): string {
    return this.baseText;
  }

  getLastPreview(): string {
    return this.lastPreview;
  }
}
