import {
  LIVE_BARGE_IN_VOICE_ACTIVITY,
  createVoiceActivityState,
  reduceVoiceActivity,
  type VoiceActivityState
} from "../../voice/voiceActivity";

export type LiveBargeInAudioMonitorState = VoiceActivityState & {
  level: number;
  now: number;
};

export interface LiveBargeInAudioMonitorControllerDeps {
  canRequestStream: () => boolean;
  getStream: () => Promise<MediaStream | null>;
  createAudioContext: () => AudioContext;
  requestAnimationFrame: (callback: FrameRequestCallback) => number;
  cancelAnimationFrame: (id: number) => void;
  now: () => number;
  getNormalizedLevel: (data: Uint8Array) => number;
  shouldKeep: () => boolean;
  shouldRun: () => boolean;
  isOwnedStream: (stream: MediaStream) => boolean;
  shouldInterrupt: (state: LiveBargeInAudioMonitorState) => boolean;
  onVoiceDetected: () => Promise<void> | void;
  warn: (label: string, error: unknown) => void;
}

export class LiveBargeInAudioMonitorController {
  private stream: MediaStream | null = null;
  private audioContext: AudioContext | null = null;
  private source: MediaStreamAudioSourceNode | null = null;
  private analyser: AnalyserNode | null = null;
  private animationFrame: number | null = null;
  private voiceActivityState: LiveBargeInAudioMonitorState =
    this.createInitialState();

  constructor(private readonly deps: LiveBargeInAudioMonitorControllerDeps) {}

  async start(): Promise<void> {
    if (this.analyser) {
      if (this.animationFrame === null) {
        this.animate();
      }
      return;
    }

    if (!this.deps.canRequestStream()) {
      return;
    }

    try {
      const stream = await this.deps.getStream();

      if (!stream) {
        return;
      }

      if (!this.deps.shouldKeep()) {
        if (!this.deps.isOwnedStream(stream)) {
          stream.getTracks().forEach((track) => track.stop());
        }
        return;
      }

      this.stream = stream;
      this.audioContext = this.deps.createAudioContext();

      if (this.audioContext.state === "suspended") {
        await this.audioContext.resume();
      }

      this.analyser = this.audioContext.createAnalyser();
      this.analyser.fftSize = 256;
      this.source = this.audioContext.createMediaStreamSource(stream);
      this.source.connect(this.analyser);
      this.voiceActivityState = this.createInitialState();
      this.animate();
    } catch (error) {
      this.deps.warn("[Mindo] Live barge-in audio monitor unavailable", error);
    }
  }

  stop(): void {
    if (this.animationFrame !== null) {
      this.deps.cancelAnimationFrame(this.animationFrame);
      this.animationFrame = null;
    }

    if (this.stream && !this.deps.isOwnedStream(this.stream)) {
      this.stream.getTracks().forEach((track) => track.stop());
    }

    this.stream = null;
    this.source?.disconnect();
    this.source = null;
    void this.audioContext?.close();
    this.audioContext = null;
    this.analyser = null;
    this.voiceActivityState = this.createInitialState();
  }

  clearStreamIfCurrent(stream: MediaStream | null): void {
    if (stream && this.stream === stream) {
      this.stream = null;
    }
  }

  private animate(): void {
    if (!this.analyser || !this.deps.shouldKeep()) {
      this.animationFrame = null;
      return;
    }

    const data = new Uint8Array(this.analyser.frequencyBinCount);
    this.analyser.getByteTimeDomainData(data);
    const level = this.deps.getNormalizedLevel(data);
    const now = this.deps.now();

    if (!this.deps.shouldRun()) {
      this.voiceActivityState = this.createInitialState();
      this.animationFrame = this.deps.requestAnimationFrame(() => {
        this.animate();
      });
      return;
    }

    this.voiceActivityState = {
      ...reduceVoiceActivity(this.voiceActivityState, {
        type: "level",
        now,
        level,
        ...LIVE_BARGE_IN_VOICE_ACTIVITY
      }),
      level,
      now
    };

    if (this.deps.shouldInterrupt(this.voiceActivityState)) {
      void this.deps.onVoiceDetected();
      return;
    }

    this.animationFrame = this.deps.requestAnimationFrame(() => {
      this.animate();
    });
  }

  private createInitialState(): LiveBargeInAudioMonitorState {
    return {
      ...createVoiceActivityState(),
      level: 0,
      now: 0
    };
  }
}
