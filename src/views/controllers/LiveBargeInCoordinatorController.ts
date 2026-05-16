import type { SpeechRecognitionConstructor } from "../sidebarTypes";

export interface LiveBargeInCoordinatorState {
  isLiveDialogueSessionActive: boolean;
  isRecording: boolean;
  isTranscribingVoice: boolean;
  isAssistantBusy: boolean;
  hasLiveAudioTrack: boolean;
}

export interface LiveBargeInCoordinatorSpeechController {
  start(options: {
    language: string;
    recognitionConstructor: SpeechRecognitionConstructor | null;
    shouldRestart: () => boolean;
    onTranscript: (transcript: string) => void;
    onUnavailable: (error: unknown) => void;
  }): boolean;
  stop(): void;
  isActive(): boolean;
}

export interface LiveBargeInCoordinatorDeps {
  getState: () => LiveBargeInCoordinatorState;
  now: () => number;
  getLanguage: () => string;
  getRecognitionConstructor: () => SpeechRecognitionConstructor | null;
  speechController: LiveBargeInCoordinatorSpeechController;
  startAudioMonitor: () => Promise<void> | void;
  stopAudioMonitor: () => void;
  onTranscript: (transcript: string) => void;
  onUnavailable: (error: unknown) => void;
}

export class LiveBargeInCoordinatorController {
  private disabledUntil = 0;

  constructor(private readonly deps: LiveBargeInCoordinatorDeps) {}

  sync(): void {
    if (this.shouldKeepAudioMonitor()) {
      void this.deps.startAudioMonitor();
    } else {
      this.deps.stopAudioMonitor();
    }

    if (this.shouldRunSpeechMonitor()) {
      this.startSpeechMonitor(false);
    } else {
      this.stopSpeechMonitor();
    }
  }

  shouldKeepAudioMonitor(): boolean {
    const state = this.deps.getState();
    return state.isLiveDialogueSessionActive && state.hasLiveAudioTrack;
  }

  shouldRunSpeechMonitor(): boolean {
    const state = this.deps.getState();
    return Boolean(
      state.isLiveDialogueSessionActive &&
        !state.isRecording &&
        !state.isTranscribingVoice &&
        state.isAssistantBusy
    );
  }

  startSpeechMonitor(shouldStartAudioMonitor = true): void {
    if (shouldStartAudioMonitor) {
      void this.deps.startAudioMonitor();
    }

    if (
      !this.shouldRunSpeechMonitor() ||
      this.deps.speechController.isActive() ||
      this.deps.now() < this.disabledUntil
    ) {
      return;
    }

    const recognitionConstructor = this.deps.getRecognitionConstructor();
    const started = this.deps.speechController.start({
      language: this.deps.getLanguage(),
      recognitionConstructor,
      shouldRestart: () => this.shouldRunSpeechMonitor(),
      onTranscript: (transcript) => {
        this.deps.onTranscript(transcript);
      },
      onUnavailable: (error) => {
        this.disableTemporarily(this.deps.now());
        this.deps.onUnavailable(error);
      }
    });

    if (!started && !recognitionConstructor) {
      this.disableTemporarily(this.deps.now());
    }
  }

  stopSpeechMonitor(): void {
    this.deps.speechController.stop();
  }

  disableTemporarily(now = this.deps.now()): void {
    this.disabledUntil = now + 2500;
  }

  getDisabledUntil(): number {
    return this.disabledUntil;
  }
}
