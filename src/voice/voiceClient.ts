import type { ContexSettings } from "../types";

export async function transcribeAudio(
  settings: ContexSettings,
  audioBlob: Blob
): Promise<string> {
  const endpoint = settings.sttEndpoint.trim();

  if (!endpoint) {
    throw new Error("STT endpoint is not configured.");
  }

  const formData = new FormData();
  formData.append("file", audioBlob, "contex-recording.webm");
  formData.append("model", "whisper-1");

  const response = await fetch(endpoint, {
    method: "POST",
    body: formData
  });

  if (!response.ok) {
    throw new Error(
      `STT request failed: ${response.status} ${response.statusText}`
    );
  }

  const contentType = response.headers.get("content-type") ?? "";

  if (contentType.includes("application/json")) {
    const json = (await response.json()) as Record<string, unknown>;
    const text = getStringField(json, ["text", "transcript", "result"]);

    if (text) {
      return text.trim();
    }

    throw new Error("STT response did not include text.");
  }

  return (await response.text()).trim();
}

export async function requestRemoteSpeechAudio(
  settings: ContexSettings,
  text: string
): Promise<Blob> {
  const endpoint = getTtsEndpoint(settings);

  if (!endpoint) {
    throw new Error(`${settings.ttsProvider} TTS endpoint is not configured.`);
  }

  let response: Response;

  try {
    response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(buildTtsRequestBody(settings, text))
    });
  } catch (error) {
    throw new Error(
      `${settings.ttsProvider} TTS endpoint is not reachable at ${endpoint}: ${getErrorMessage(error)}`
    );
  }

  if (!response.ok) {
    throw new Error(
      `TTS request failed: ${response.status} ${response.statusText}`
    );
  }

  return response.blob();
}

function getTtsEndpoint(settings: ContexSettings): string {
  if (settings.ttsProvider === "kokoro") {
    return settings.kokoroTtsEndpoint.trim();
  }

  if (settings.ttsProvider === "silero") {
    return settings.sileroTtsEndpoint.trim();
  }

  return "";
}

function buildTtsRequestBody(
  settings: ContexSettings,
  text: string
): Record<string, unknown> {
  if (settings.ttsProvider === "kokoro") {
    return {
      model: settings.kokoroModel || "kokoro",
      input: text,
      voice: settings.kokoroVoice || "af_heart",
      response_format: "wav"
    };
  }

  return {
    text,
    voice: settings.sileroVoice || undefined
  };
}

function getStringField(
  data: Record<string, unknown>,
  keys: string[]
): string | null {
  for (const key of keys) {
    const value = data[key];

    if (typeof value === "string") {
      return value;
    }
  }

  return null;
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  return String(error);
}
