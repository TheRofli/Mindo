export interface VoiceLevelMeterControllerStartOptions {
  stream: MediaStream;
  waveformEl: HTMLElement | null;
  bars: HTMLElement[];
  orbEl: HTMLElement | null;
}

export interface VoiceLevelMeterControllerDeps {
  createAudioContext: () => AudioContext;
  requestAnimationFrame: (callback: FrameRequestCallback) => number;
  cancelAnimationFrame: (id: number) => void;
  getNormalizedLevel: (data: Uint8Array) => number;
  onLevel: (level: number) => void;
  warn: (label: string, error: unknown) => void;
}

export class VoiceLevelMeterController {
  private audioContext: AudioContext | null = null;
  private audioAnalyser: AnalyserNode | null = null;
  private animationFrame: number | null = null;
  private waveformEl: HTMLElement | null = null;
  private bars: HTMLElement[] = [];
  private orbEl: HTMLElement | null = null;

  constructor(private readonly deps: VoiceLevelMeterControllerDeps) {}

  start(options: VoiceLevelMeterControllerStartOptions): void {
    this.stop();
    this.waveformEl = options.waveformEl;
    this.bars = options.bars;
    this.orbEl = options.orbEl;

    try {
      this.audioContext = this.deps.createAudioContext();
      this.audioAnalyser = this.audioContext.createAnalyser();
      this.audioAnalyser.fftSize = 256;
      this.audioContext
        .createMediaStreamSource(options.stream)
        .connect(this.audioAnalyser);
      this.waveformEl?.addClass("is-active");
      this.animate();
    } catch (error) {
      this.deps.warn("[Mindo] Voice level meter unavailable", error);
      this.audioContext = null;
      this.audioAnalyser = null;
    }
  }

  stop(): void {
    if (this.animationFrame !== null) {
      this.deps.cancelAnimationFrame(this.animationFrame);
      this.animationFrame = null;
    }

    this.waveformEl?.removeClass("is-active");
    this.bars.forEach((bar) => {
      bar.setCssStyles({
        opacity: "",
        transform: ""
      });
    });
    this.orbEl?.setCssProps({
      "--contex-live-glow": "",
      "--contex-live-scale": ""
    });
    void this.audioContext?.close();
    this.audioContext = null;
    this.audioAnalyser = null;
  }

  private animate(): void {
    if (!this.audioAnalyser || !this.bars.length) {
      return;
    }

    const data = new Uint8Array(this.audioAnalyser.frequencyBinCount);
    this.audioAnalyser.getByteTimeDomainData(data);
    const normalized = this.deps.getNormalizedLevel(data);
    this.deps.onLevel(normalized);
    this.orbEl?.setCssProps({
      "--contex-live-glow": (0.06 + normalized * 0.18).toFixed(3),
      "--contex-live-scale": (1 + normalized * 0.16).toFixed(3)
    });

    this.bars.forEach((bar, index) => {
      const distanceFromCenter = Math.abs(index - (this.bars.length - 1) / 2);
      const centerWeight = 1 - distanceFromCenter / this.bars.length;
      const scale = 0.35 + normalized * (0.65 + centerWeight);
      bar.setCssStyles({
        opacity: `${0.45 + normalized * 0.55}`,
        transform: `scaleY(${Math.max(0.25, scale).toFixed(2)})`
      });
    });

    this.animationFrame = this.deps.requestAnimationFrame(() => {
      this.animate();
    });
  }
}
