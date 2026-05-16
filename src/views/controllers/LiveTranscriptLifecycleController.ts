import type { SpeechRecognitionConstructor } from "../sidebarTypes";
import type {
  LiveTranscriptPreviewStartOptions,
  LiveTranscriptPreviewUpdate
} from "./LiveTranscriptPreviewController";

export interface LiveTranscriptLifecycleControllerDeps {
  stopPreview: () => void;
  beginDraft: () => boolean;
  startPreview: (options: LiveTranscriptPreviewStartOptions) => boolean;
  updateDraft: (finalText: string, interimText: string) => void;
  clearDraft: () => void;
  restoreDraft: () => void;
  getLanguage: () => string;
  getRecognitionConstructor: () => SpeechRecognitionConstructor | null;
  shouldRestart: () => boolean;
  onUnavailable: (error: unknown) => void;
  getEvents?: () => string[];
}

export class LiveTranscriptLifecycleController {
  constructor(private readonly deps: LiveTranscriptLifecycleControllerDeps) {}

  start(): void {
    this.stop();

    if (!this.deps.beginDraft()) {
      return;
    }

    const started = this.deps.startPreview({
      language: this.deps.getLanguage(),
      recognitionConstructor: this.deps.getRecognitionConstructor(),
      shouldRestart: () => this.deps.shouldRestart(),
      onPreview: (update: LiveTranscriptPreviewUpdate) => {
        this.deps.updateDraft(update.finalText, update.interimText);
      },
      onUnavailable: (error) => {
        this.deps.onUnavailable(error);
      }
    });

    if (!started) {
      this.clear();
    }
  }

  stop(): void {
    this.deps.stopPreview();
  }

  clear(): void {
    this.deps.clearDraft();
  }

  restore(): void {
    this.deps.restoreDraft();
  }
}
