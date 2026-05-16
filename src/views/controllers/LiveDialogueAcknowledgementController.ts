import {
  buildLiveDialogueAcknowledgement,
  type LiveDialogueAcknowledgementKind
} from "../../voice/liveDialogue";

type TtsProviderName = string | null | undefined;

interface PlayableAudio {
  addEventListener: (event: "ended" | "error", callback: () => void) => void;
  pause: () => void;
  play: () => Promise<void> | void;
}

export interface LiveDialogueAcknowledgementControllerDeps {
  getTtsProvider: () => TtsProviderName;
  isSessionActive: () => boolean;
  requestAudio: (text: string) => Promise<Blob>;
  createObjectUrl: (blob: Blob) => string;
  revokeObjectUrl: (url: string) => void;
  createAudio: (url: string) => PlayableAudio;
  buildText?: (kind: LiveDialogueAcknowledgementKind) => string;
  onError?: (error: unknown) => void;
}

const ACKNOWLEDGEMENT_KINDS: LiveDialogueAcknowledgementKind[] = [
  "thinking",
  "opening",
  "editing",
  "researching"
];

export class LiveDialogueAcknowledgementController {
  private readonly audioCache = new Map<LiveDialogueAcknowledgementKind, Blob>();
  private activeAudio: PlayableAudio | null = null;
  private activeAudioUrl: string | null = null;
  private speechText = "";

  constructor(
    private readonly deps: LiveDialogueAcknowledgementControllerDeps
  ) {}

  async warm(): Promise<void> {
    if (!this.canUseRemoteTts()) {
      return;
    }

    await Promise.allSettled(
      ACKNOWLEDGEMENT_KINDS.map(async (kind) => {
        try {
          await this.getAudio(kind);
        } catch (error) {
          this.deps.onError?.(error);
        }
      })
    );
  }

  async getAudio(kind: LiveDialogueAcknowledgementKind): Promise<Blob> {
    const cached = this.audioCache.get(kind);

    if (cached) {
      return cached;
    }

    const audio = await this.deps.requestAudio(this.getAcknowledgementText(kind));
    this.audioCache.set(kind, audio);

    return audio;
  }

  async play(kind: LiveDialogueAcknowledgementKind): Promise<void> {
    if (!this.deps.isSessionActive() || !this.canUseRemoteTts()) {
      return;
    }

    const cachedAudio = this.audioCache.get(kind);

    if (!cachedAudio) {
      return;
    }

    this.stop();

    const audioUrl = this.deps.createObjectUrl(cachedAudio);
    const audio = this.deps.createAudio(audioUrl);
    this.speechText = this.getAcknowledgementText(kind);
    this.activeAudio = audio;
    this.activeAudioUrl = audioUrl;

    const cleanup = () => {
      if (this.activeAudio === audio) {
        this.stop();
      }
    };

    audio.addEventListener("ended", cleanup);
    audio.addEventListener("error", cleanup);
    await audio.play();
  }

  stop(): void {
    if (this.activeAudio) {
      this.activeAudio.pause();
      this.activeAudio = null;
    }

    this.speechText = "";

    if (this.activeAudioUrl) {
      this.deps.revokeObjectUrl(this.activeAudioUrl);
      this.activeAudioUrl = null;
    }
  }

  getSpeechText(): string {
    return this.speechText;
  }

  private getAcknowledgementText(kind: LiveDialogueAcknowledgementKind): string {
    return this.deps.buildText?.(kind) ?? buildLiveDialogueAcknowledgement(kind);
  }

  private canUseRemoteTts(): boolean {
    const provider = this.deps.getTtsProvider();

    return Boolean(provider && provider !== "disabled" && provider !== "browser");
  }
}
