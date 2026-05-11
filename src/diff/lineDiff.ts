import type { TextDiffPreview } from "../types";

export type DiffLineType = "same" | "added" | "removed";

export interface DiffLine {
  type: DiffLineType;
  text: string;
}

export function buildLineDiff(original: string, suggested: string): DiffLine[] {
  const originalLines = splitLines(original);
  const suggestedLines = splitLines(suggested);
  const table = buildLcsTable(originalLines, suggestedLines);
  const diffLines: DiffLine[] = [];
  let originalIndex = 0;
  let suggestedIndex = 0;

  while (
    originalIndex < originalLines.length ||
    suggestedIndex < suggestedLines.length
  ) {
    if (
      originalIndex < originalLines.length &&
      suggestedIndex < suggestedLines.length &&
      originalLines[originalIndex] === suggestedLines[suggestedIndex]
    ) {
      diffLines.push({
        type: "same",
        text: originalLines[originalIndex]
      });
      originalIndex += 1;
      suggestedIndex += 1;
      continue;
    }

    if (
      suggestedIndex < suggestedLines.length &&
      (originalIndex === originalLines.length ||
        table[originalIndex][suggestedIndex + 1] >=
          table[originalIndex + 1][suggestedIndex])
    ) {
      diffLines.push({
        type: "added",
        text: suggestedLines[suggestedIndex]
      });
      suggestedIndex += 1;
      continue;
    }

    if (originalIndex < originalLines.length) {
      diffLines.push({
        type: "removed",
        text: originalLines[originalIndex]
      });
      originalIndex += 1;
    }
  }

  return diffLines;
}

function buildLcsTable(left: string[], right: string[]): number[][] {
  const table = Array.from({ length: left.length + 1 }, () =>
    Array.from({ length: right.length + 1 }, () => 0)
  );

  for (let leftIndex = left.length - 1; leftIndex >= 0; leftIndex -= 1) {
    for (let rightIndex = right.length - 1; rightIndex >= 0; rightIndex -= 1) {
      table[leftIndex][rightIndex] =
        left[leftIndex] === right[rightIndex]
          ? table[leftIndex + 1][rightIndex + 1] + 1
          : Math.max(
              table[leftIndex + 1][rightIndex],
              table[leftIndex][rightIndex + 1]
            );
    }
  }

  return table;
}

function splitLines(content: string): string[] {
  return content.replace(/\r\n/g, "\n").split("\n");
}

export function getCompactDiffStatusText(
  status: TextDiffPreview["status"]
): string {
  if (status === "applied") {
    return "Applied to the source note. You can undo this change.";
  }

  if (status === "reverted") {
    return "Reverted. The original text was restored.";
  }

  if (status === "rejected") {
    return "Rejected. No changes were made.";
  }

  return "Pending review.";
}

export function getDiffPrefix(type: DiffLineType): string {
  if (type === "added") {
    return "+";
  }

  if (type === "removed") {
    return "-";
  }

  return " ";
}
