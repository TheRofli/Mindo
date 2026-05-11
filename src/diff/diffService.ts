import type { TextDiffPreview } from "../types";

export interface TextReplacementDiffInput {
  title: string;
  sourcePath: string;
  original: string;
  suggested: string;
  operationType?: string;
  originalOccurrenceIndex?: number;
  userPrompt?: string;
}

export function buildTextReplacementDiffPreview(
  input: TextReplacementDiffInput
): TextDiffPreview {
  return {
    title: input.title,
    sourcePath: input.sourcePath,
    operationType: input.operationType ?? "text-replacement",
    originalOccurrenceIndex: input.originalOccurrenceIndex,
    original: input.original,
    suggested: input.suggested,
    status: "pending",
    userPrompt: input.userPrompt
  };
}
