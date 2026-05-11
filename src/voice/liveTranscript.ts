export function getSpeechRecognitionLanguage(languageHint: string): string {
  const normalized = languageHint.trim().toLowerCase();

  if (normalized.startsWith("en")) {
    return "en-US";
  }

  if (normalized.startsWith("ru") || normalized === "auto" || !normalized) {
    return "ru-RU";
  }

  return normalized.includes("-") ? normalized : `${normalized}-${normalized.toUpperCase()}`;
}

export function buildLiveTranscriptValue(
  baseText: string,
  interimText: string,
  finalText: string
): string {
  const base = baseText.trim();
  const final = finalText.trim();
  const interim = interimText.trim();
  const spoken = final || interim;

  return [base, spoken].filter(Boolean).join(" ").trim();
}

export function shouldUseFinalTranscription(
  finalTranscription: string,
  livePreview: string
): boolean {
  const finalText = normalizeTranscript(finalTranscription);
  const previewText = normalizeTranscript(livePreview);

  if (!finalText) {
    return false;
  }

  if (!previewText) {
    return true;
  }

  return finalText !== previewText;
}

function normalizeTranscript(text: string): string {
  return text
    .trim()
    .toLowerCase()
    .replace(/[‐-‒–—―]/g, " ")
    .replace(/[.,!?;:«»"'`]/g, "")
    .replace(/\s+/g, " ");
}
