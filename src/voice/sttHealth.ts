import type { ContexSettings, SttBackend } from "../types";

export interface SttHealthPayload {
  status?: unknown;
  backend?: unknown;
  model?: unknown;
}

export function isSttHealthCompatible(
  settings: Pick<ContexSettings, "sttBackend" | "sttModel">,
  payload: SttHealthPayload | null
): boolean {
  if (!payload || payload.status !== "ok") {
    return false;
  }

  const rawBackend = String(payload.backend ?? "").trim();
  const backend = normalizeHealthBackend(payload.backend);
  const model = String(payload.model ?? "").trim();

  if (!rawBackend) {
    return model === settings.sttModel;
  }

  return backend === settings.sttBackend && model === settings.sttModel;
}

function normalizeHealthBackend(value: unknown): SttBackend {
  const backend = String(value ?? "").trim();

  if (backend === "faster-whisper") {
    return "faster-whisper";
  }

  return "parakeet";
}
