import type { ContexSettings } from "../../types";
import {
  isMostlyEnglishSpeech,
  prepareSileroSpeechText
} from "../../voice/speechText";

type RemoteSpeechSettings = Pick<
  ContexSettings,
  | "fallbackToBrowserTts"
  | "sileroPronunciationDictionary"
  | "sileroVoice"
  | "ttsProvider"
>;

export interface RemoteSpeechControllerDeps {
  getSettings: () => RemoteSpeechSettings;
  getSpeakingMessageId: () => string | null;
  requestKokoroSpeechAudio: (text: string) => Promise<Blob>;
  requestSileroSpeechAudio: (text: string) => Promise<Blob>;
  playSpeechAudio: (audioBlob: Blob, messageId: string) => void;
  speakWithBrowser: (text: string, messageId: string) => void;
  stopSpeaking: () => void;
  setStatus: (message: string) => void;
  setError: (message: string | null) => void;
  renderMessages: () => unknown;
  notify: (message: string) => void;
  warn: (label: string, message: string) => void;
  getErrorMessage: (error: unknown) => string;
}

export class RemoteSpeechController {
  constructor(public readonly deps: RemoteSpeechControllerDeps) {}

  async requestRemoteSpeechAudio(text: string): Promise<Blob> {
    const settings = this.deps.getSettings();
    const speechText = text.trim();

    if (!speechText) {
      throw new Error("TTS chunk is empty.");
    }

    if (
      settings.ttsProvider === "silero" &&
      !settings.sileroVoice.trim().startsWith("en_") &&
      isMostlyEnglishSpeech(speechText)
    ) {
      return this.deps.requestKokoroSpeechAudio(speechText);
    }

    if (settings.ttsProvider === "silero") {
      return this.deps.requestSileroSpeechAudio(
        prepareSileroSpeechText(
          speechText,
          settings.sileroPronunciationDictionary
        )
      );
    }

    if (settings.ttsProvider === "kokoro") {
      return this.deps.requestKokoroSpeechAudio(speechText);
    }

    throw new Error("Remote TTS provider is not configured.");
  }

  async speakWithRemoteProvider(
    text: string,
    messageId: string
  ): Promise<void> {
    const settings = this.deps.getSettings();

    if (
      settings.ttsProvider === "silero" &&
      !settings.sileroVoice.trim().startsWith("en_") &&
      isMostlyEnglishSpeech(text)
    ) {
      await this.speakViaProvider({
        text,
        messageId,
        status: "Status: Reading English with Kokoro",
        unavailableStatus: "Status: Kokoro unavailable",
        fallbackNotice:
          "Kokoro English TTS is unavailable. Falling back to Browser TTS.",
        requestAudio: () => this.deps.requestKokoroSpeechAudio(text)
      });
      return;
    }

    if (settings.ttsProvider === "silero") {
      await this.speakViaProvider({
        text,
        messageId,
        status: "Status: Reading with Silero",
        unavailableStatus: "Status: Silero unavailable",
        fallbackNotice:
          "Silero TTS is unavailable. Falling back to Browser TTS.",
        requestAudio: () =>
          this.deps.requestSileroSpeechAudio(
            prepareSileroSpeechText(
              text,
              settings.sileroPronunciationDictionary
            )
          )
      });
      return;
    }

    if (settings.ttsProvider === "kokoro") {
      await this.speakViaProvider({
        text,
        messageId,
        status: "Status: Reading with Kokoro",
        unavailableStatus: "Status: Kokoro unavailable",
        fallbackNotice:
          "Kokoro English TTS is unavailable. Falling back to Browser TTS.",
        requestAudio: () => this.deps.requestKokoroSpeechAudio(text)
      });
    }
  }

  private async speakViaProvider(options: {
    text: string;
    messageId: string;
    status: string;
    unavailableStatus: string;
    fallbackNotice: string;
    requestAudio: () => Promise<Blob>;
  }): Promise<void> {
    this.deps.setStatus(options.status);

    try {
      const audioBlob = await options.requestAudio();

      if (this.deps.getSpeakingMessageId() !== options.messageId) {
        return;
      }

      this.deps.playSpeechAudio(audioBlob, options.messageId);
    } catch (error) {
      if (this.deps.getSpeakingMessageId() !== options.messageId) {
        return;
      }

      const message = this.deps.getErrorMessage(error);
      this.deps.warn("[Mindo TTS]", message);

      if (this.deps.getSettings().fallbackToBrowserTts) {
        this.deps.notify(options.fallbackNotice);
        this.deps.setError(null);
        this.deps.setStatus("Status: Reading with Browser TTS");
        this.deps.speakWithBrowser(options.text, options.messageId);
        return;
      }

      this.deps.stopSpeaking();
      this.deps.setError(message);
      this.deps.setStatus(options.unavailableStatus);
      this.deps.renderMessages();
    }
  }
}
