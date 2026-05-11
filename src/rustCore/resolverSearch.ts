export interface RustResolvedPath {
  path: string;
  score: number;
}

export function parseRustCoreResolveResponse(value: unknown): RustResolvedPath[] {
  if (!value || typeof value !== "object") {
    return [];
  }

  const response = value as { results?: unknown };
  if (!Array.isArray(response.results)) {
    return [];
  }

  return response.results
    .map((item) => {
      const candidate = item as Partial<RustResolvedPath>;

      return typeof candidate.path === "string" &&
        typeof candidate.score === "number"
        ? {
            path: candidate.path,
            score: candidate.score
          }
        : null;
    })
    .filter((item): item is RustResolvedPath => Boolean(item));
}
