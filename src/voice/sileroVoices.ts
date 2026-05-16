export const DEFAULT_SILERO_VOICE = "eugene";

export type SileroVoiceLanguage = "ru";

export interface SileroVoiceOption {
  id: string;
  label: string;
  language: SileroVoiceLanguage;
  modelId: string;
}

export interface SileroVoiceModelConfig {
  voice: string;
  language: SileroVoiceLanguage;
  modelId: string;
  modelUrl: string;
  sampleRate: number;
}

export const SILERO_MODEL_CONFIGS: Record<
  string,
  Omit<SileroVoiceModelConfig, "voice">
> = {
  "ru-v5_5": {
    language: "ru",
    modelId: "ru-v5_5",
    modelUrl: "https://models.silero.ai/models/tts/ru/v5_5_ru.pt",
    sampleRate: 48000
  }
};

export const SILERO_VOICE_OPTIONS = [
  {
    id: "baya",
    label: "Baya - Russian female",
    language: "ru",
    modelId: "ru-v5_5"
  },
  {
    id: "eugene",
    label: "Eugene - Russian male",
    language: "ru",
    modelId: "ru-v5_5"
  }
] as const satisfies readonly SileroVoiceOption[];

export const SUPPORTED_SILERO_VOICES: Set<string> = new Set(
  SILERO_VOICE_OPTIONS.map((voice) => voice.id)
);

export function getSileroVoiceModelConfig(
  voice: string
): SileroVoiceModelConfig {
  const option =
    SILERO_VOICE_OPTIONS.find((item) => item.id === voice) ??
    SILERO_VOICE_OPTIONS.find((item) => item.id === DEFAULT_SILERO_VOICE);

  if (!option) {
    throw new Error("No Silero voices are configured.");
  }

  const modelConfig = SILERO_MODEL_CONFIGS[option.modelId];

  if (!modelConfig) {
    throw new Error(`Silero model config is missing for ${option.modelId}.`);
  }

  return {
    voice: option.id,
    ...modelConfig
  };
}
