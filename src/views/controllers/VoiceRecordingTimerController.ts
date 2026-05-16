export const RECORDING_TIMER_INTERVAL_MS = 250;

export interface VoiceRecordingTimerControllerDeps {
  now: () => number;
  setInterval: (callback: () => void, ms: number) => number;
  clearInterval: (timerId: number) => void;
  formatElapsedTime: (startedAt: number, now?: number) => string;
}

export function getRecordingTimerResetText(): string {
  return "0:00";
}

export class VoiceRecordingTimerController {
  private startedAt = 0;
  private timerId: number | null = null;

  constructor(private readonly deps: VoiceRecordingTimerControllerDeps) {}

  start(timerEl: HTMLElement | null): void {
    this.stop(timerEl, false);

    if (!this.startedAt) {
      this.startedAt = this.deps.now();
    }

    timerEl?.addClass("is-active");
    this.update(timerEl);
    this.timerId = this.deps.setInterval(() => {
      this.update(timerEl);
    }, RECORDING_TIMER_INTERVAL_MS);
  }

  stop(timerEl: HTMLElement | null, resetStart = true): void {
    if (this.timerId !== null) {
      this.deps.clearInterval(this.timerId);
      this.timerId = null;
    }

    if (resetStart) {
      this.startedAt = 0;
    }

    timerEl?.removeClass("is-active");

    if (resetStart) {
      timerEl?.setText(getRecordingTimerResetText());
    }
  }

  update(timerEl: HTMLElement | null): void {
    if (!timerEl || !this.startedAt) {
      return;
    }

    timerEl.setText(
      this.deps.formatElapsedTime(this.startedAt, this.deps.now())
    );
  }
}
