import {
  DEFAULT_SETTINGS,
  type ContexSettings
} from "../types";
import {
  DEFAULT_KOKORO_VOICE
} from "../voice/kokoroVoices";
import {
  DEFAULT_SILERO_VOICE,
  SUPPORTED_SILERO_VOICES
} from "../voice/sileroVoices";
import { getEffectiveSttBeamSize } from "../voice/sttOptions";

export function getEndpointHealthUrl(endpoint: string): string | null {
  try {
    const url = new URL(endpoint);
    url.pathname = "/health";
    url.search = "";
    url.hash = "";
    return url.toString();
  } catch {
    return null;
  }
}

export function getEndpointPort(endpoint: string, fallbackPort: number): number {
  try {
    const url = new URL(endpoint);

    if (url.port) {
      return Number.parseInt(url.port, 10);
    }

    return url.protocol === "https:" ? 443 : 80;
  } catch {
    return fallbackPort;
  }
}

export function getEndpointHost(endpoint: string, fallbackHost: string): string {
  try {
    const url = new URL(endpoint);
    return url.hostname || fallbackHost;
  } catch {
    return fallbackHost;
  }
}

export function getLocalKokoroEnvironment(
  settings: ContexSettings,
  baseEnvironment: NodeJS.ProcessEnv = process.env
): NodeJS.ProcessEnv {
  return {
    ...baseEnvironment,
    CONTEX_KOKORO_JS_PORT: String(getEndpointPort(settings.kokoroTtsEndpoint, 9200)),
    CONTEX_KOKORO_MODEL:
      settings.kokoroModel || DEFAULT_SETTINGS.kokoroModel,
    CONTEX_KOKORO_VOICE:
      settings.kokoroVoice || DEFAULT_KOKORO_VOICE
  };
}

export function getLocalSttEnvironment(
  settings: ContexSettings,
  baseEnvironment: NodeJS.ProcessEnv = process.env
): NodeJS.ProcessEnv {
  const language = settings.sttLanguage.trim();

  return {
    ...baseEnvironment,
    CONTEX_STT_BACKEND: settings.sttBackend,
    CONTEX_STT_MODEL: settings.sttModel || DEFAULT_SETTINGS.sttModel,
    CONTEX_STT_HOST: getEndpointHost(settings.sttEndpoint, "127.0.0.1"),
    CONTEX_STT_PORT: String(getEndpointPort(settings.sttEndpoint, 9000)),
    CONTEX_STT_LANGUAGE:
      language.toLowerCase() === "auto" ? "" : language,
    CONTEX_STT_BEAM_SIZE: String(
      getEffectiveSttBeamSize(
        settings.sttQualityMode,
        settings.sttBeamSize || DEFAULT_SETTINGS.sttBeamSize
      )
    ),
    CONTEX_STT_INITIAL_PROMPT:
      settings.sttInitialPrompt ||
      DEFAULT_SETTINGS.sttInitialPrompt
  };
}

export function getLocalSileroEnvironment(
  settings: ContexSettings,
  baseEnvironment: NodeJS.ProcessEnv = process.env
): NodeJS.ProcessEnv {
  return {
    ...baseEnvironment,
    CONTEX_SILERO_VOICE: getConfiguredLocalSileroVoiceName(settings),
    CONTEX_SILERO_PORT: String(getEndpointPort(settings.sileroTtsEndpoint, 9100))
  };
}

export function getConfiguredLocalSileroVoiceName(
  settings: Pick<ContexSettings, "sileroVoice">
): string {
  const voice = (settings.sileroVoice || DEFAULT_SILERO_VOICE).trim();
  return SUPPORTED_SILERO_VOICES.has(voice) ? voice : DEFAULT_SILERO_VOICE;
}
