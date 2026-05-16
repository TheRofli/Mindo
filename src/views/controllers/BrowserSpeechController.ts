import { findSpeechVoice, guessSpeechLanguage } from "../../voice/speechText";

interface SpeechSynthesisLike {
  speak(utterance: SpeechSynthesisUtterance): void;
  cancel(): void;
}

interface BrowserSpeechControllerDeps {
  getSpeechSynthesis: () => SpeechSynthesisLike | null | undefined;
  createUtterance: (text: string) => SpeechSynthesisUtterance;
  onFinished: (messageId: string) => void;
  guessLanguage?: (text: string) => string;
  findVoice?: (language: string) => SpeechSynthesisVoice | null;
}

export class BrowserSpeechController {
  private speechUtterance: SpeechSynthesisUtterance | null = null;

  constructor(private readonly deps: BrowserSpeechControllerDeps) {}

  speak(text: string, messageId: string): void {
    const synthesis = this.deps.getSpeechSynthesis();

    if (!synthesis) {
      throw new Error("Browser speech synthesis is not available.");
    }

    const utterance = this.deps.createUtterance(text);
    const language = (this.deps.guessLanguage ?? guessSpeechLanguage)(text);
    const voice = (this.deps.findVoice ?? findSpeechVoice)(language);
    utterance.lang = language;

    if (voice) {
      utterance.voice = voice;
    }

    utterance.onend = () => this.finish(messageId);
    utterance.onerror = () => this.finish(messageId);
    this.speechUtterance = utterance;
    synthesis.speak(utterance);
  }

  stop(): void {
    if (!this.speechUtterance) {
      return;
    }

    this.deps.getSpeechSynthesis()?.cancel();
    this.speechUtterance = null;
  }

  finish(messageId: string): void {
    this.speechUtterance = null;
    this.deps.onFinished(messageId);
  }
}
