import type { ContexWikiNode, ContexWikiSourceKind } from "./wikiSchema";

export type WikiConfidenceLevel = "high" | "medium" | "low" | "stale";

export interface WikiConfidenceOptions {
  now?: string;
  staleAfterDays?: number;
}

export interface WikiConfidenceAssessment {
  score: number;
  level: WikiConfidenceLevel;
  needsRefresh: boolean;
  sourceCount: number;
  reasons: string[];
}

export interface WikiMaintenanceTarget {
  node: ContexWikiNode;
  assessment: WikiConfidenceAssessment;
  priority: number;
}

const DEFAULT_STALE_AFTER_DAYS = 120;
const DAY_MS = 24 * 60 * 60 * 1000;

const SOURCE_KIND_WEIGHT: Record<ContexWikiSourceKind, number> = {
  web: 0.16,
  vault: 0.14,
  raw: 0.12,
  attachment: 0.1,
  chat: 0.08,
  manual: 0.04
};

export function scoreWikiNodeConfidence(
  node: ContexWikiNode,
  options: WikiConfidenceOptions = {}
): WikiConfidenceAssessment {
  const reasons: string[] = [];
  const sourceCount = node.sources.length;
  const nowMs = Date.parse(options.now ?? new Date().toISOString());
  const updatedMs = Date.parse(node.updatedAt);
  const staleAfterDays = options.staleAfterDays ?? DEFAULT_STALE_AFTER_DAYS;
  const ageDays =
    Number.isFinite(nowMs) && Number.isFinite(updatedMs)
      ? Math.max(0, Math.floor((nowMs - updatedMs) / DAY_MS))
      : 0;
  const freshnessPenalty =
    node.freshness === "stale" || ageDays > staleAfterDays ? 0.35 : 0;
  const sourceBoost = Math.min(
    0.32,
    node.sources.reduce(
      (total, source) => total + (SOURCE_KIND_WEIGHT[source.kind] ?? 0.04),
      0
    )
  );
  const relationBoost = Math.min(0.08, node.relations.length * 0.02);
  const summaryPenalty = node.summary.trim().length < 40 ? 0.08 : 0;
  const noSourcePenalty = sourceCount === 0 ? 0.18 : 0;
  const rawScore =
    node.confidence +
    sourceBoost +
    relationBoost -
    freshnessPenalty -
    summaryPenalty -
    noSourcePenalty;
  const score = clamp01(rawScore);
  const needsRefresh =
    node.freshness === "stale" ||
    ageDays > staleAfterDays ||
    sourceCount === 0 ||
    score < 0.45;

  if (sourceCount === 0) {
    reasons.push("No sources");
  }

  if (freshnessPenalty > 0) {
    reasons.push(
      node.freshness === "stale"
        ? "Marked stale"
        : `Older than ${staleAfterDays} days`
    );
  }

  if (node.summary.trim().length < 40) {
    reasons.push("Short summary");
  }

  if (sourceBoost >= 0.25) {
    reasons.push("Multiple strong sources");
  }

  return {
    score,
    level: getConfidenceLevel(score, needsRefresh),
    needsRefresh,
    sourceCount,
    reasons
  };
}

export function buildWikiConfidenceLabel(
  assessment: WikiConfidenceAssessment
): string {
  const label = capitalize(assessment.level);
  const percent = Math.round(assessment.score * 100);
  const refresh = assessment.needsRefresh ? " · refresh needed" : "";

  return `${label} confidence · ${percent}% · ${assessment.sourceCount} sources${refresh}`;
}

export function rankWikiMaintenanceTargets(
  nodes: ContexWikiNode[],
  options: WikiConfidenceOptions = {}
): WikiMaintenanceTarget[] {
  return nodes
    .map((node) => {
      const assessment = scoreWikiNodeConfidence(node, options);
      const priority =
        (assessment.needsRefresh ? 100 : 0) +
        Math.round((1 - assessment.score) * 100) +
        Math.max(0, 3 - assessment.sourceCount) * 5;

      return {
        node,
        assessment,
        priority
      };
    })
    .sort((left, right) => right.priority - left.priority);
}

function getConfidenceLevel(
  score: number,
  needsRefresh: boolean
): WikiConfidenceLevel {
  if (needsRefresh && score < 0.65) {
    return "stale";
  }

  if (score >= 0.8) {
    return "high";
  }

  if (score >= 0.55) {
    return "medium";
  }

  return "low";
}

function clamp01(value: number): number {
  return Number.isFinite(value) ? Math.min(1, Math.max(0, value)) : 0;
}

function capitalize(value: string): string {
  return value.slice(0, 1).toUpperCase() + value.slice(1);
}
