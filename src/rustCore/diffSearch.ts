export interface RustDiffLine {
  kind: "same" | "remove" | "add";
  text: string;
}

export function parseRustCoreDiffResponse(value: unknown): RustDiffLine[] {
  if (!value || typeof value !== "object") {
    return [];
  }

  const response = value as { lines?: unknown };

  if (!Array.isArray(response.lines)) {
    return [];
  }

  return response.lines
    .map((item) => {
      const candidate = item as Partial<RustDiffLine>;

      return isRustDiffKind(candidate.kind) && typeof candidate.text === "string"
        ? {
            kind: candidate.kind,
            text: candidate.text
          }
        : null;
    })
    .filter((item): item is RustDiffLine => Boolean(item));
}

function isRustDiffKind(value: unknown): value is RustDiffLine["kind"] {
  return value === "same" || value === "remove" || value === "add";
}
