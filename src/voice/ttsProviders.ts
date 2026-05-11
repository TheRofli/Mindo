import type { TtsProvider } from "../types";

export const DEFAULT_TTS_PROVIDER: TtsProvider = "silero";

export const TTS_PROVIDER_OPTIONS: Array<{
  value: TtsProvider;
  label: string;
}> = [
  { value: "browser", label: "Browser" },
  { value: "disabled", label: "Disabled" },
  { value: "kokoro", label: "Kokoro English" },
  { value: "silero", label: "Silero Russian" }
];

const SUPPORTED_TTS_PROVIDER_IDS = new Set(
  TTS_PROVIDER_OPTIONS.map((provider) => provider.value)
);

export function sanitizeTtsProvider(value: string): TtsProvider {
  return SUPPORTED_TTS_PROVIDER_IDS.has(value as TtsProvider)
    ? (value as TtsProvider)
    : DEFAULT_TTS_PROVIDER;
}
