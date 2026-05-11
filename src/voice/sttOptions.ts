import {
  type SttBackend,
  type SttModel,
  type SttQualityMode
} from "../types";

export interface SttModelOption {
  value: SttModel;
  label: string;
  backend: SttBackend;
}

export const STT_BACKEND_OPTIONS: Array<{
  value: SttBackend;
  label: string;
  description: string;
}> = [
  {
    value: "faster-whisper",
    label: "faster-whisper",
    description: "Bundled Python Whisper helper. Reliable fallback for Russian + English."
  },
  {
    value: "parakeet",
    label: "Parakeet TDT 0.6B v3",
    description: "Default local NVIDIA NeMo Parakeet runner for the best voice-command quality."
  }
];

export const STT_QUALITY_MODE_OPTIONS: Array<{
  value: SttQualityMode;
  label: string;
  beamSize: number;
}> = [
  { value: "speed", label: "Speed - beam 1", beamSize: 1 },
  { value: "balanced", label: "Balanced - beam 3", beamSize: 3 },
  { value: "quality", label: "Quality - custom beam", beamSize: 5 }
];

const STT_MODEL_OPTIONS: SttModelOption[] = [
  { backend: "faster-whisper", value: "tiny", label: "tiny - fastest" },
  { backend: "faster-whisper", value: "base", label: "base - balanced" },
  { backend: "faster-whisper", value: "small", label: "small - smarter default" },
  { backend: "faster-whisper", value: "medium", label: "medium - high quality" },
  { backend: "faster-whisper", value: "large-v3", label: "large-v3 - best, heavy" },
  {
    backend: "faster-whisper",
    value: "large-v3-turbo",
    label: "large-v3-turbo - faster large"
  },
  {
    backend: "parakeet",
    value: "nvidia/parakeet-tdt-0.6b-v3",
    label: "nvidia/parakeet-tdt-0.6b-v3"
  }
];

export function sanitizeSttBackend(value: unknown): SttBackend {
  return STT_BACKEND_OPTIONS.some((option) => option.value === value)
    ? (value as SttBackend)
    : "parakeet";
}

export function sanitizeSttQualityMode(value: unknown): SttQualityMode {
  return STT_QUALITY_MODE_OPTIONS.some((option) => option.value === value)
    ? (value as SttQualityMode)
    : "quality";
}

export function getSttModelOptionsForBackend(
  backend: SttBackend
): SttModelOption[] {
  return STT_MODEL_OPTIONS.filter((option) => option.backend === backend);
}

export function sanitizeSttModelForBackend(
  backend: SttBackend,
  model: unknown
): SttModel {
  const options = getSttModelOptionsForBackend(backend);
  const value = String(model ?? "");

  return (
    options.find((option) => option.value === value)?.value ??
    options[0]?.value ??
    "nvidia/parakeet-tdt-0.6b-v3"
  );
}

export function getEffectiveSttBeamSize(
  qualityMode: SttQualityMode,
  customBeamSize: number
): number {
  if (qualityMode === "speed") {
    return 1;
  }

  if (qualityMode === "balanced") {
    return 3;
  }

  return Number.isFinite(customBeamSize)
    ? Math.min(10, Math.max(1, Math.round(customBeamSize)))
    : 5;
}
