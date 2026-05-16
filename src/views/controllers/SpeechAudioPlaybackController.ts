interface PlayableAudio {
  addEventListener(event: "ended" | "error", callback: () => void): void;
  pause(): void;
  play(): Promise<void>;
}

interface SpeechAudioPlaybackControllerDeps {
  getSpeakingMessageId: () => string | null;
  createObjectUrl: (blob: Blob) => string;
  revokeObjectUrl: (url: string) => void;
  createAudio: (url: string) => PlayableAudio;
  onFinished: (messageId: string) => void;
}

export class SpeechAudioPlaybackController {
  private activeAudio: PlayableAudio | null = null;
  private activeAudioUrl: string | null = null;

  constructor(private readonly deps: SpeechAudioPlaybackControllerDeps) {}

  play(audioBlob: Blob, messageId: string): void {
    if (this.deps.getSpeakingMessageId() !== messageId) {
      return;
    }

    this.stop();

    const audioUrl = this.deps.createObjectUrl(audioBlob);
    const audio = this.deps.createAudio(audioUrl);
    this.activeAudio = audio;
    this.activeAudioUrl = audioUrl;

    const finish = () => {
      this.finish();
      this.deps.onFinished(messageId);
    };

    audio.addEventListener("ended", finish);
    audio.addEventListener("error", finish);
    void audio.play();
  }

  stop(): void {
    if (this.activeAudio) {
      this.activeAudio.pause();
      this.activeAudio = null;
    }

    this.revokeActiveUrl();
  }

  finish(): void {
    if (this.activeAudio) {
      this.activeAudio.pause();
      this.activeAudio = null;
    }

    this.revokeActiveUrl();
  }

  private revokeActiveUrl(): void {
    if (!this.activeAudioUrl) {
      return;
    }

    this.deps.revokeObjectUrl(this.activeAudioUrl);
    this.activeAudioUrl = null;
  }
}
