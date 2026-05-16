import type {
  ChatMessage,
  ContexSettings,
  LlmRequestContext
} from "../../types";
import type { RustCoreRuntimeDiagnostics } from "../../rustCore/indexedSearch";
import type { ContexDiagnosticsInput } from "../contexDiagnostics";

export interface LocalSttStatus {
  autoStart: boolean;
  backend: string;
  endpoint: string;
  isRunning: boolean;
  language: string;
  model: string;
}

export interface SystemHealthControllerDeps {
  settings: ContexSettings;
  getLocalSttStatus: () => Promise<LocalSttStatus>;
  requestLlmChatCompletion: (
    settings: ContexSettings,
    messages: ChatMessage[],
    context?: LlmRequestContext | null
  ) => Promise<string>;
  getActiveNoteLabel: () => string | null | undefined;
  getRustCoreRuntimeDiagnostics: () => RustCoreRuntimeDiagnostics;
  buildContexDiagnosticsLines: (
    input: ContexDiagnosticsInput
  ) => string[];
  setError: (message: string | null) => void;
  setStatus: (status: string) => void;
  notify: (message: string, timeout?: number) => void;
  refreshSttStatus: () => Promise<void>;
  getErrorMessage: (error: unknown) => string;
}

export class SystemHealthController {
  constructor(private readonly deps: SystemHealthControllerDeps) {}

  async check(): Promise<void> {
    this.deps.setError(null);
    this.deps.setStatus("Status: Checking Mindo");

    try {
      const [sttStatus, llmResponse] = await Promise.all([
        this.deps.getLocalSttStatus(),
        this.deps.requestLlmChatCompletion(this.deps.settings, [
          {
            id: `${Date.now()}-health`,
            role: "user",
            content: "Reply with exactly: OK",
            createdAt: Date.now()
          }
        ])
      ]);
      const llmOk = llmResponse.trim().toLowerCase().includes("ok");
      const activeNote = this.deps.getActiveNoteLabel() ?? "none";

      this.deps.notify(
        [
          `LLM: ${llmOk ? "OK" : "responded"}`,
          `STT: ${sttStatus.isRunning ? "running" : "offline"} (${sttStatus.model})`,
          `TTS: ${this.deps.settings.ttsProvider}`,
          `Active note: ${activeNote}`
        ].join("\n")
      );
      this.deps.setStatus("Status: Ready");
      void this.deps.refreshSttStatus();
    } catch (error) {
      this.deps.setError(this.deps.getErrorMessage(error));
      this.deps.setStatus("Status: Health check failed");
    }
  }

  showDiagnostics(): void {
    const rust = this.deps.getRustCoreRuntimeDiagnostics();
    const activeNote = this.deps.getActiveNoteLabel() ?? "none";
    const lines = this.deps.buildContexDiagnosticsLines({
      activeNote,
      model: this.deps.settings.model,
      rust
    });

    this.deps.notify(lines.join("\n"), 9000);
  }
}
