import type { LocalSttStatus } from "./SystemHealthController";

export type SttStatusTone = "ok" | "warning" | "busy";

export interface SttStatusControllerDeps {
  getStatusEl: () => HTMLElement | null;
  isRecording: () => boolean;
  getLocalSttStatus: () => Promise<LocalSttStatus>;
  getErrorMessage: (error: unknown) => string;
}

const STT_STATUS_TONE_CLASSES = [
  "contex-agent__stt-status--ok",
  "contex-agent__stt-status--warning",
  "contex-agent__stt-status--busy"
] as const;

export class SttStatusController {
  constructor(private readonly deps: SttStatusControllerDeps) {}

  async refresh(): Promise<void> {
    if (!this.deps.getStatusEl() || this.deps.isRecording()) {
      return;
    }

    this.setText("STT: checking...", "busy");

    try {
      const status = await this.deps.getLocalSttStatus();
      const label = `STT: ${status.isRunning ? "running" : "offline"} (${status.backend}, ${status.model}, ${status.language})`;
      this.setText(label, status.isRunning ? "ok" : "warning");
    } catch (error) {
      this.setText(
        `STT: unknown (${this.deps.getErrorMessage(error)})`,
        "warning"
      );
    }
  }

  setText(text: string, tone: SttStatusTone): void {
    const statusEl = this.deps.getStatusEl();

    if (!statusEl) {
      return;
    }

    statusEl.setText(text);
    for (const className of STT_STATUS_TONE_CLASSES) {
      statusEl.removeClass(className);
    }
    statusEl.addClass(`contex-agent__stt-status--${tone}`);
  }
}
