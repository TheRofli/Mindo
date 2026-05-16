import type { ContexSettings } from "../../types";

interface SpeechMessage {
  id: string;
  content: string;
}

type TtsReadMode = ContexSettings["ttsReadMode"];

interface SpeechMessageControllerDeps {
  getTtsProvider: () => string;
  getTtsReadMode: () => TtsReadMode;
  getSpeakingMessageId: () => string | null;
  setSpeakingMessageId: (messageId: string | null) => void;
  prepareSpeechText: (content: string, mode: TtsReadMode) => string;
  speakWithBrowser: (text: string, messageId: string) => void;
  speakWithRemoteProvider: (
    text: string,
    messageId: string
  ) => Promise<void>;
  waitForCompletion: (messageId: string) => Promise<boolean>;
  stopSpeaking: () => void;
  notify: (message: string) => void;
  setStatus: (message: string) => void;
  setError: (message: string | null) => void;
  renderMessages: () => unknown;
  syncLiveBargeInMonitor: () => void;
  getErrorMessage: (error: unknown) => string;
}

export class SpeechMessageController {
  constructor(private readonly deps: SpeechMessageControllerDeps) {}

  async speakMessage(message: SpeechMessage): Promise<boolean> {
    if (this.deps.getTtsProvider() === "disabled") {
      this.deps.notify("TTS provider is disabled.");
      this.deps.setError("TTS provider is disabled.");
      this.deps.setStatus("Status: TTS disabled");
      return false;
    }

    const text = this.deps.prepareSpeechText(
      message.content,
      this.deps.getTtsReadMode()
    );

    if (!text) {
      this.deps.notify("There is no readable assistant text.");
      this.deps.setError("There is no readable assistant text.");
      this.deps.setStatus("Status: Nothing to read");
      return false;
    }

    this.deps.stopSpeaking();
    this.deps.setSpeakingMessageId(message.id);
    this.deps.setStatus("Status: Reading answer");
    this.deps.syncLiveBargeInMonitor();
    this.deps.renderMessages();

    try {
      if (this.deps.getTtsProvider() === "browser") {
        this.deps.speakWithBrowser(text, message.id);
        return true;
      }

      await this.deps.speakWithRemoteProvider(text, message.id);
      return true;
    } catch (error) {
      this.deps.stopSpeaking();
      this.deps.setError(this.deps.getErrorMessage(error));
      this.deps.setStatus("Status: TTS failed");
      this.deps.renderMessages();
      return false;
    }
  }

  async speakMessageAndWait(message: SpeechMessage): Promise<boolean> {
    const started = await this.speakMessage(message);

    if (!started) {
      return false;
    }

    if (this.deps.getSpeakingMessageId() !== message.id) {
      return true;
    }

    return this.deps.waitForCompletion(message.id);
  }
}
