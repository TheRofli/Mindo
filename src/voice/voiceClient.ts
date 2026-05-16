import { requestUrl } from "obsidian";
import type { ContexSettings } from "../types";

export async function transcribeAudio(
  settings: ContexSettings,
  audioBlob: Blob
): Promise<string> {
  const endpoint = settings.sttEndpoint.trim();

  if (!endpoint) {
    throw new Error("STT endpoint is not configured.");
  }

  const multipart = await createMultipartBody([
    {
      name: "file",
      filename: "contex-recording.webm",
      contentType: audioBlob.type || "application/octet-stream",
      data: await audioBlob.arrayBuffer()
    },
    {
      name: "model",
      data: "whisper-1"
    }
  ]);

  const response = await requestUrl({
    url: endpoint,
    method: "POST",
    headers: {
      "Content-Type": `multipart/form-data; boundary=${multipart.boundary}`
    },
    body: multipart.body,
    throw: false
  });

  if (response.status < 200 || response.status >= 300) {
    throw new Error(
      `STT request failed: ${response.status} ${response.text.trim()}`
    );
  }

  const contentType = getResponseHeader(response.headers, "content-type");

  if (contentType.includes("application/json")) {
    const json = response.json as Record<string, unknown>;
    const text = getStringField(json, ["text", "transcript", "result"]);

    if (text) {
      return text.trim();
    }

    throw new Error("STT response did not include text.");
  }

  return response.text.trim();
}

export async function requestRemoteSpeechAudio(
  settings: ContexSettings,
  text: string
): Promise<Blob> {
  const endpoint = getTtsEndpoint(settings);

  if (!endpoint) {
    throw new Error(`${settings.ttsProvider} TTS endpoint is not configured.`);
  }

  let response;

  try {
    response = await requestUrl({
      url: endpoint,
      method: "POST",
      contentType: "application/json",
      headers: {
        Accept: "audio/wav, audio/mpeg, application/octet-stream"
      },
      body: JSON.stringify(buildTtsRequestBody(settings, text)),
      throw: false
    });
  } catch (error) {
    throw new Error(
      `${settings.ttsProvider} TTS endpoint is not reachable at ${endpoint}: ${getErrorMessage(error)}`
    );
  }

  if (response.status < 200 || response.status >= 300) {
    throw new Error(
      `TTS request failed: ${response.status} ${response.text.trim()}`
    );
  }

  return new Blob([response.arrayBuffer], {
    type: getResponseHeader(response.headers, "content-type") || "audio/wav"
  });
}

interface MultipartPart {
  name: string;
  data: string | ArrayBuffer;
  filename?: string;
  contentType?: string;
}

async function createMultipartBody(
  parts: MultipartPart[]
): Promise<{ boundary: string; body: ArrayBuffer }> {
  const boundary = `----contex-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const encoder = new TextEncoder();
  const chunks: Uint8Array[] = [];

  for (const part of parts) {
    const headerLines = [
      `--${boundary}`,
      `Content-Disposition: form-data; name="${escapeMultipartValue(part.name)}"${
        part.filename ? `; filename="${escapeMultipartValue(part.filename)}"` : ""
      }`
    ];

    if (part.contentType) {
      headerLines.push(`Content-Type: ${part.contentType}`);
    }

    const headers = [
      ...headerLines,
      "",
      ""
    ].join("\r\n");

    chunks.push(encoder.encode(headers));
    chunks.push(part.data instanceof ArrayBuffer ? new Uint8Array(part.data) : encoder.encode(part.data));
    chunks.push(encoder.encode("\r\n"));
  }

  chunks.push(encoder.encode(`--${boundary}--\r\n`));
  return {
    boundary,
    body: mergeChunks(chunks)
  };
}

function mergeChunks(chunks: Uint8Array[]): ArrayBuffer {
  const length = chunks.reduce((total, chunk) => total + chunk.byteLength, 0);
  const merged = new Uint8Array(length);
  let offset = 0;

  for (const chunk of chunks) {
    merged.set(chunk, offset);
    offset += chunk.byteLength;
  }

  return merged.buffer;
}

function escapeMultipartValue(value: string): string {
  return value.replace(/["\r\n]/g, "_");
}

function getResponseHeader(
  headers: Record<string, string> | undefined,
  name: string
): string {
  if (!headers) {
    return "";
  }

  const expectedName = name.toLowerCase();
  const key = Object.keys(headers).find(
    (candidate) => candidate.toLowerCase() === expectedName
  );

  return key ? headers[key] : "";
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
