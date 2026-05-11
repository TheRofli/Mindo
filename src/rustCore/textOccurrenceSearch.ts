export interface RustTextOccurrenceMatch {
  original: string;
  occurrenceIndex?: number;
  score: number;
}

export interface RustTextOccurrenceResult {
  match: RustTextOccurrenceMatch | null;
  error: string | null;
}

export { encodeRustCoreTextOccurrenceWireRequest } from "./indexProtocol";

export function parseRustCoreTextOccurrenceResponse(
  value: unknown
): RustTextOccurrenceResult {
  if (!value || typeof value !== "object") {
    return {
      match: null,
      error: "Invalid Rust text occurrence response."
    };
  }

  const response = value as {
    match?: unknown;
    error?: unknown;
  };
  const error =
    typeof response.error === "string" && response.error.trim()
      ? response.error
      : null;

  if (!response.match || typeof response.match !== "object") {
    return {
      match: null,
      error
    };
  }

  const match = response.match as Partial<RustTextOccurrenceMatch>;

  if (
    typeof match.original !== "string" ||
    typeof match.score !== "number"
  ) {
    return {
      match: null,
      error: error ?? "Invalid Rust text occurrence match."
    };
  }

  return {
    match: {
      original: match.original,
      occurrenceIndex:
        typeof match.occurrenceIndex === "number"
          ? match.occurrenceIndex
          : undefined,
      score: match.score
    },
    error
  };
}
