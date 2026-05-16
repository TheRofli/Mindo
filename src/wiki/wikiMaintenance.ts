import type { ContexWikiNode } from "./wikiSchema";

export interface WikiMaintenanceInput {
  nodes: ContexWikiNode[];
  aliases?: Record<string, string[]>;
  existingLocators?: Set<string>;
  now?: string;
  staleAfterDays?: number;
}

export interface WikiMaintenanceIssue {
  nodeId: string;
  title: string;
  detail: string;
}

export interface WikiDuplicateAliasIssue {
  alias: string;
  nodeIds: string[];
}

export interface WikiBrokenRelationIssue {
  nodeId: string;
  targetId: string;
  relationType: string;
}

export interface WikiMaintenanceReport {
  summary: {
    nodes: number;
    duplicateAliases: number;
    brokenRelations: number;
    brokenSources: number;
    staleNodes: number;
    orphanNodes: number;
  };
  duplicateAliases: WikiDuplicateAliasIssue[];
  brokenRelations: WikiBrokenRelationIssue[];
  brokenSources: WikiMaintenanceIssue[];
  staleNodes: WikiMaintenanceIssue[];
  orphanNodes: WikiMaintenanceIssue[];
}

const DEFAULT_STALE_AFTER_DAYS = 120;
const DAY_MS = 24 * 60 * 60 * 1000;

export function analyzeWikiMaintenance(
  input: WikiMaintenanceInput
): WikiMaintenanceReport {
  const nowMs = Date.parse(input.now ?? new Date().toISOString());
  const staleAfterDays = input.staleAfterDays ?? DEFAULT_STALE_AFTER_DAYS;
  const nodeIds = new Set(input.nodes.map((node) => node.id));
  const referencedNodeIds = new Set<string>();
  const duplicateAliases = findDuplicateAliases(input.nodes, input.aliases);
  const brokenRelations: WikiBrokenRelationIssue[] = [];
  const brokenSources: WikiMaintenanceIssue[] = [];
  const staleNodes: WikiMaintenanceIssue[] = [];
  const orphanNodes: WikiMaintenanceIssue[] = [];

  input.nodes.forEach((node) => {
    node.relations.forEach((relation) => {
      referencedNodeIds.add(relation.targetId);

      if (!nodeIds.has(relation.targetId)) {
        brokenRelations.push({
          nodeId: node.id,
          targetId: relation.targetId,
          relationType: relation.type
        });
      }
    });

    if (input.existingLocators) {
      node.sources.forEach((source) => {
        if (shouldCheckLocator(source.kind) && !input.existingLocators?.has(source.locator)) {
          brokenSources.push({
            nodeId: node.id,
            title: node.title,
            detail: source.locator
          });
        }
      });
    }

    if (isStaleNode(node, nowMs, staleAfterDays)) {
      staleNodes.push({
        nodeId: node.id,
        title: node.title,
        detail: node.freshness === "stale" ? "freshness=stale" : node.updatedAt
      });
    }
  });

  input.nodes.forEach((node) => {
    if (!node.relations.length && !referencedNodeIds.has(node.id)) {
      orphanNodes.push({
        nodeId: node.id,
        title: node.title,
        detail: "No incoming or outgoing relations"
      });
    }
  });

  return {
    summary: {
      nodes: input.nodes.length,
      duplicateAliases: duplicateAliases.length,
      brokenRelations: brokenRelations.length,
      brokenSources: brokenSources.length,
      staleNodes: staleNodes.length,
      orphanNodes: orphanNodes.length
    },
    duplicateAliases,
    brokenRelations,
    brokenSources,
    staleNodes,
    orphanNodes
  };
}

export function buildWikiMaintenanceMarkdown(
  report: WikiMaintenanceReport,
  parseErrors: Array<{ line: number; message: string }> = []
): string {
  return [
    "# Mindo Wiki Maintenance",
    "",
    `Generated: ${new Date().toISOString()}`,
    "",
    "## Summary",
    "",
    `- Nodes: ${report.summary.nodes}`,
    `- Duplicate aliases: ${report.summary.duplicateAliases}`,
    `- Broken relations: ${report.summary.brokenRelations}`,
    `- Broken sources: ${report.summary.brokenSources}`,
    `- Stale nodes: ${report.summary.staleNodes}`,
    `- Orphan nodes: ${report.summary.orphanNodes}`,
    parseErrors.length ? `- JSONL parse errors: ${parseErrors.length}` : "",
    "",
    formatDuplicateAliases(report.duplicateAliases),
    formatBrokenRelations(report.brokenRelations),
    formatIssueSection("Broken sources", report.brokenSources),
    formatIssueSection("Stale nodes", report.staleNodes),
    formatIssueSection("Orphan nodes", report.orphanNodes),
    formatParseErrors(parseErrors)
  ]
    .filter((line) => line !== "")
    .join("\n");
}

function findDuplicateAliases(
  nodes: ContexWikiNode[],
  aliases: Record<string, string[]> | undefined
): WikiDuplicateAliasIssue[] {
  const aliasMap = new Map<string, Set<string>>();

  nodes.forEach((node) => {
    node.aliases.forEach((alias) => addAlias(aliasMap, alias, node.id));
  });

  Object.entries(aliases ?? {}).forEach(([alias, nodeIds]) => {
    nodeIds.forEach((nodeId) => addAlias(aliasMap, alias, nodeId));
  });

  return [...aliasMap.entries()]
    .filter(([, nodeIds]) => nodeIds.size > 1)
    .map(([alias, nodeIds]) => ({
      alias,
      nodeIds: [...nodeIds].sort()
    }))
    .sort((left, right) => left.alias.localeCompare(right.alias));
}

function addAlias(
  aliasMap: Map<string, Set<string>>,
  alias: string,
  nodeId: string
): void {
  const normalized = alias.trim().toLowerCase().replace(/\s+/g, " ");

  if (!normalized || !nodeId.trim()) {
    return;
  }

  const existing = aliasMap.get(normalized) ?? new Set<string>();
  existing.add(nodeId);
  aliasMap.set(normalized, existing);
}

function shouldCheckLocator(kind: string): boolean {
  return kind === "vault" || kind === "raw" || kind === "attachment";
}

function isStaleNode(
  node: ContexWikiNode,
  nowMs: number,
  staleAfterDays: number
): boolean {
  if (node.freshness === "stale") {
    return true;
  }

  const updatedMs = Date.parse(node.updatedAt);

  if (!Number.isFinite(nowMs) || !Number.isFinite(updatedMs)) {
    return false;
  }

  return nowMs - updatedMs > staleAfterDays * DAY_MS;
}

function formatDuplicateAliases(issues: WikiDuplicateAliasIssue[]): string {
  return [
    "## Duplicate aliases",
    "",
    issues.length
      ? issues.map((issue) => `- ${issue.alias}: ${issue.nodeIds.join(", ")}`).join("\n")
      : "- None"
  ].join("\n");
}

function formatBrokenRelations(issues: WikiBrokenRelationIssue[]): string {
  return [
    "## Broken relations",
    "",
    issues.length
      ? issues
          .map(
            (issue) =>
              `- ${issue.nodeId} --${issue.relationType}--> ${issue.targetId}`
          )
          .join("\n")
      : "- None"
  ].join("\n");
}

function formatIssueSection(title: string, issues: WikiMaintenanceIssue[]): string {
  return [
    `## ${title}`,
    "",
    issues.length
      ? issues
          .map((issue) => `- ${issue.nodeId} (${issue.title}): ${issue.detail}`)
          .join("\n")
      : "- None"
  ].join("\n");
}

function formatParseErrors(
  parseErrors: Array<{ line: number; message: string }>
): string {
  return [
    "## Schema parse errors",
    "",
    parseErrors.length
      ? parseErrors
          .map((error) => `- Line ${error.line}: ${error.message}`)
          .join("\n")
      : "- None"
  ].join("\n");
}
