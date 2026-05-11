import type { SttBackend } from "../types";

export interface SttRuntimeConfig {
  backend: SttBackend;
  startupLabel: string;
  requirementsFile: string;
  firstRunNotice: string;
}

const STT_RUNTIME_CONFIGS: Record<SttBackend, SttRuntimeConfig> = {
  "faster-whisper": {
    backend: "faster-whisper",
    startupLabel: "faster-whisper",
    requirementsFile: "requirements-faster-whisper.txt",
    firstRunNotice:
      "First run may install faster-whisper dependencies and download the selected Whisper model."
  },
  parakeet: {
    backend: "parakeet",
    startupLabel: "Parakeet TDT 0.6B v3",
    requirementsFile: "requirements-parakeet.txt",
    firstRunNotice:
      "First run may install NVIDIA NeMo/Torch dependencies and download Parakeet TDT 0.6B v3."
  }
};

export function getSttRuntimeConfig(backend: SttBackend): SttRuntimeConfig {
  return STT_RUNTIME_CONFIGS[backend] ?? STT_RUNTIME_CONFIGS.parakeet;
}

export function shouldAutoStartSttBackend(backend: SttBackend): boolean {
  return Boolean(STT_RUNTIME_CONFIGS[backend]);
}
