export interface LiveDialogueInputStreamControllerDeps {
  isSessionActive: () => boolean;
  requestStream: (constraints: MediaStreamConstraints) => Promise<MediaStream>;
  onError: (message: string) => void;
}

export class LiveDialogueInputStreamController {
  private stream: MediaStream | null = null;
  private streamPromise: Promise<MediaStream | null> | null = null;

  constructor(private readonly deps: LiveDialogueInputStreamControllerDeps) {}

  getCurrent(): MediaStream | null {
    return this.stream;
  }

  isCurrent(stream: MediaStream | null): boolean {
    return Boolean(stream && stream === this.stream);
  }

  hasLiveAudioTrack(stream: MediaStream | null): boolean {
    return Boolean(
      stream?.getAudioTracks().some((track) => track.readyState === "live")
    );
  }

  getConstraints(): MediaStreamConstraints {
    return {
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true
      }
    };
  }

  async ensure(): Promise<MediaStream | null> {
    if (!this.deps.isSessionActive()) {
      return null;
    }

    if (this.hasLiveAudioTrack(this.stream)) {
      return this.stream;
    }

    this.stop();

    if (!this.streamPromise) {
      this.streamPromise = this.deps
        .requestStream(this.getConstraints())
        .then((stream) => {
          if (!this.deps.isSessionActive()) {
            stream.getTracks().forEach((track) => track.stop());
            return null;
          }

          this.stream = stream;
          return stream;
        })
        .catch((error) => {
          this.deps.onError(
            error instanceof Error ? error.message : String(error)
          );
          return null;
        })
        .finally(() => {
          this.streamPromise = null;
        });
    }

    return this.streamPromise;
  }

  stop(): void {
    this.stream?.getTracks().forEach((track) => track.stop());
    this.stream = null;
    this.streamPromise = null;
  }
}
