import type {
  SpeechRecognitionConstructor,
  SpeechRecognitionLike
} from "../sidebarTypes";

export interface LiveBargeInSpeechStartOptions {
  language: string;
  recognitionConstructor: SpeechRecognitionConstructor | null;
  shouldRestart: () => boolean;
  onTranscript: (transcript: string) => void;
  onUnavailable?: (error: unknown) => void;
  scheduleRestart?: (callback: () => void, delayMs: number) => void;
}

export class LiveBargeInSpeechController {
  private recognition: SpeechRecognitionLike | null = null;
  private options: LiveBargeInSpeechStartOptions | null = null;
  private restartTimer: number | null = null;

  start(options: LiveBargeInSpeechStartOptions): boolean {
    if (this.recognition || this.restartTimer !== null) {
      return false;
    }

    const Recognition = options.recognitionConstructor;
    if (!Recognition) {
      return false;
    }

    this.options = options;

    try {
      const recognition = new Recognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = options.language;

      recognition.onresult = (event) => {
        const finalTranscriptParts: string[] = [];

        for (let index = event.resultIndex; index < event.results.length; index += 1) {
          const result = event.results[index];
          const transcript = result?.[0]?.transcript?.trim() ?? "";

          if (result.isFinal && transcript) {
            finalTranscriptParts.push(transcript);
          }
        }

        const finalTranscript = finalTranscriptParts.join(" ").trim();
        if (finalTranscript) {
          options.onTranscript(finalTranscript);
        }
      };

      recognition.onerror = (error) => {
        this.stop();
        options.onUnavailable?.(error);
      };

      recognition.onend = () => {
        if (this.recognition === recognition) {
          this.recognition = null;
        }

        this.scheduleRestartIfNeeded();
      };

      recognition.start();
      this.recognition = recognition;
      return true;
    } catch (error) {
      this.recognition = null;
      this.options = null;
      options.onUnavailable?.(error);
      return false;
    }
  }

  stop(): void {
    if (this.restartTimer !== null) {
      window.clearTimeout(this.restartTimer);
      this.restartTimer = null;
    }

    const recognition = this.recognition;
    this.recognition = null;
    this.options = null;

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
    return Boolean(this.recognition || this.restartTimer !== null);
  }

  private scheduleRestartIfNeeded(): void {
    const options = this.options;
    if (!options?.shouldRestart() || this.restartTimer !== null) {
      return;
    }

    const scheduleRestart =
      options.scheduleRestart ??
      ((callback, delayMs) => {
        this.restartTimer = window.setTimeout(callback, delayMs);
      });

    scheduleRestart(() => {
      this.restartTimer = null;

      if (!this.recognition && options.shouldRestart()) {
        this.start(options);
      }
    }, 350);
  }
}
