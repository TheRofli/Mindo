import {
  rankOpenFilePathCandidates,
  type OpenFilePathCandidate
} from "./openFileResolver";

export const DEFAULT_MIN_DIRECT_SCORE = 420;
export const DEFAULT_AMBIGUITY_GAP = 160;
export const DEFAULT_MAX_CLARIFY_CANDIDATES = 3;

export type OpenFileResolution =
  | { kind: "direct"; candidate: OpenFilePathCandidate; reason: string }
  | { kind: "clarify"; candidates: OpenFilePathCandidate[]; reason: string }
  | { kind: "none"; reason: string };

export interface ResolveOpenFileTargetOptions {
  paths: string[];
  query: string;
  currentPath?: string | null;
  minDirectScore?: number;
  ambiguityGap?: number;
  maxClarifyCandidates?: number;
}

export function resolveOpenFileTarget(
  options: ResolveOpenFileTargetOptions
): OpenFileResolution {
  const minDirectScore = options.minDirectScore ?? DEFAULT_MIN_DIRECT_SCORE;
  const ambiguityGap = options.ambiguityGap ?? DEFAULT_AMBIGUITY_GAP;
  const maxClarifyCandidates =
    options.maxClarifyCandidates ?? DEFAULT_MAX_CLARIFY_CANDIDATES;
  const currentPath = options.currentPath
    ? normalizeVaultPath(options.currentPath)
    : null;
  const candidates = rankOpenFilePathCandidates(
    options.paths,
    options.query
  ).filter((candidate) => normalizeVaultPath(candidate.path) !== currentPath);
  const topCandidate = candidates[0];

  if (!topCandidate) {
    return {
      kind: "none",
      reason: "No Markdown note matched the requested file."
    };
  }

  if (topCandidate.score < minDirectScore) {
    return {
      kind: "none",
      reason: `No Markdown note matched "${options.query}" with enough confidence.`
    };
  }

  const secondCandidate = candidates[1];

  if (
    secondCandidate &&
    secondCandidate.score >= minDirectScore &&
    topCandidate.score - secondCandidate.score < ambiguityGap
  ) {
    return {
      kind: "clarify",
      candidates: candidates
        .filter((candidate) => candidate.score >= minDirectScore)
        .slice(0, maxClarifyCandidates),
      reason: "Multiple Markdown notes matched the requested file."
    };
  }

  return {
    kind: "direct",
    candidate: topCandidate,
    reason: "Matched the requested Markdown note with enough confidence."
  };
}

function normalizeVaultPath(path: string): string {
  return path.replaceAll("\\", "/");
}
