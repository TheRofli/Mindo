import type {
  SpeechRecognitionConstructor,
  SpeechRecognitionLike
} from "../sidebarTypes";

export interface LiveTranscriptPreviewUpdate {
  finalText: string;
  interimText: string;
}

export interface LiveTranscriptPreviewStartOptions {
  language: string;
  recognitionConstructor: SpeechRecognitionConstructor | null;
  shouldRestart: () => boolean;
  onPreview: (update: LiveTranscriptPreviewUpdate) => void;
  onUnavailable?: (error: unknown) => void;
  scheduleRestart?: (callback: () => void, delayMs: number) => void;
}

export class LiveTranscriptPreviewController {
  private recognition: SpeechRecognitionLike | null = null;
  private finalText = "";
  private options: LiveTranscriptPreviewStartOptions | null = null;

  start(options: LiveTranscriptPreviewStartOptions): boolean {
    this.stop();

    const Recognition = options.recognitionConstructor;
    if (!Recognition) {
      return false;
    }

    this.options = options;
    this.finalText = "";

    try {
      const recognition = new Recognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = options.language;

      recognition.onresult = (event) => {
        let interimText = "";

        for (let index = event.resultIndex; index < event.results.length; index += 1) {
          const result = event.results[index];
          const transcript = result?.[0]?.transcript?.trim() ?? "";

          if (!transcript) {
            continue;
          }

          if (result.isFinal) {
            this.finalText = [this.finalText, transcript]
              .filter(Boolean)
              .join(" ")
              .trim();
          } else {
            interimText = [interimText, transcript].filter(Boolean).join(" ");
          }
        }

        options.onPreview({
          finalText: this.finalText,
          interimText
        });
      };

      recognition.onerror = (error) => {
        this.stop();
        options.onUnavailable?.(error);
      };

      recognition.onend = () => {
        if (this.recognition === recognition) {
          this.recognition = null;
        }

        const currentOptions = this.options;
        if (!currentOptions?.shouldRestart()) {
          return;
        }

        const scheduleRestart =
          currentOptions.scheduleRestart ??
          ((callback, delayMs) => {
            window.setTimeout(callback, delayMs);
          });

        scheduleRestart(() => {
          if (!this.recognition && currentOptions.shouldRestart()) {
            this.start(currentOptions);
          }
        }, 150);
      };

      recognition.start();
      this.recognition = recognition;
      return true;
    } catch (error) {
      this.recognition = null;
      this.options = null;
      this.finalText = "";
      options.onUnavailable?.(error);
      return false;
    }
  }

  stop(): void {
    const recognition = this.recognition;
    this.recognition = null;
    this.options = null;
    this.finalText = "";

    if (!recognition) {
      return;
    }

    recognition.onresult = null;
    recognition.onerror = null;
    recognition.onend = null;

    try {
      recognition.stop();
    } catch {
      recognition.abort?.();
    }
  }

  isActive(): boolean {
    return Boolean(this.recognition);
  }
}
