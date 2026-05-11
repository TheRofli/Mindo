import type { VectorRagDocument } from "../rag/vectorRag";
import type { VaultSearchResult } from "../types";

export interface RustCoreSearchRequest {
  version: 1;
  query: string;
  documents: VectorRagDocument[];
  limit: number;
}

interface RustCoreSearchResponse {
  version?: unknown;
  results?: unknown;
}

interface RustCoreSearchResultCandidate {
  path?: unknown;
  title?: unknown;
  score?: unknown;
  snippet?: unknown;
  heading?: unknown;
  matches?: unknown;
}

export function buildRustCoreSearchRequest(
  query: string,
  documents: VectorRagDocument[],
  limit = 8
): RustCoreSearchRequest {
  return {
    version: 1,
    query: query.trim(),
    documents,
    limit: Math.max(1, limit)
  };
}

export function parseRustCoreSearchResponse(
  response: unknown
): VaultSearchResult[] {
  if (!response || typeof response !== "object") {
    return [];
  }

  const parsed = response as RustCoreSearchResponse;

  if (parsed.version !== 1 || !Array.isArray(parsed.results)) {
    return [];
  }

  return parsed.results
    .map((candidate) => normalizeRustCoreResult(candidate))
    .filter((result): result is VaultSearchResult => Boolean(result));
}

function normalizeRustCoreResult(candidate: unknown): VaultSearchResult | null {
  if (!candidate || typeof candidate !== "object") {
    return null;
  }

  const result = candidate as RustCoreSearchResultCandidate;

  if (
    typeof result.path !== "string" ||
    !result.path.trim() ||
    typeof result.title !== "string" ||
    typeof result.score !== "number" ||
    !Number.isFinite(result.score) ||
    typeof result.snippet !== "string"
  ) {
    return null;
  }

  return {
    path: result.path,
    title: result.title,
    score: result.score,
    snippet: result.snippet,
    heading: typeof result.heading === "string" ? result.heading : undefined,
    matches: normalizeRustCoreMatches(result.matches)
  };
}

function normalizeRustCoreMatches(matches: unknown): string[] {
  const values = Array.isArray(matches)
    ? matches.filter((match): match is string => typeof match === "string")
    : [];
  const normalized = new Set(values.map((match) => match.trim()).filter(Boolean));

  normalized.add("rust-core");

  return Array.from(normalized);
}
