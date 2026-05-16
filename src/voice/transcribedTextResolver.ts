import { shouldUseFinalTranscription } from "./liveTranscript";

export interface BestTranscribedTextInput {
  finalTranscription: string;
  liveTranscriptBaseText: string;
  liveTranscriptLastPreview: string;
  includeLiveBase: boolean;
}

export function getBestTranscribedText(input: BestTranscribedTextInput): string {
  const finalText = input.finalTranscription.trim();
  const livePreview = input.liveTranscriptLastPreview.trim();
  const liveBase = input.liveTranscriptBaseText.trim();
  const previewSpoken =
    liveBase && livePreview.startsWith(liveBase)
      ? livePreview.slice(liveBase.length).trim()
      : livePreview;

  const spokenText = !finalText
    ? previewSpoken
    : !previewSpoken
      ? finalText
      : shouldUseFinalTranscription(finalText, previewSpoken)
        ? finalText
        : previewSpoken;

  if (!input.includeLiveBase || !liveBase) {
    return spokenText;
  }

  if (startsWithLiveTranscriptBase(spokenText, liveBase)) {
    return spokenText;
  }

  return [liveBase, spokenText].filter(Boolean).join(" ").trim();
}

function startsWithLiveTranscriptBase(text: string, liveBase: string): boolean {
  const normalizedText = normalizeTranscriptPrefix(text);
  const normalizedBase = normalizeTranscriptPrefix(liveBase);

  return (
    normalizedText === normalizedBase ||
    normalizedText.startsWith(`${normalizedBase} `)
  );
}

function normalizeTranscriptPrefix(text: string): string {
  return text
    .toLocaleLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .replace(/\s+/gu, " ")
    .trim();
}
