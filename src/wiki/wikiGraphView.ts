import { buildWikiGraphIndex } from "./wikiGraphIndex";
import {
  scoreWikiNodeConfidence,
  type WikiConfidenceLevel
} from "./wikiConfidence";
import type { ContexWikiNode, ContexWikiNodeType } from "./wikiSchema";

export interface WikiGraphViewOptions {
  focusNodeId?: string;
  maxNodes?: number;
  now?: string;
}

export interface WikiGraphViewNode {
  id: string;
  title: string;
  type: ContexWikiNodeType;
  path: string;
  confidence: number;
  confidenceLevel: WikiConfidenceLevel;
  needsRefresh: boolean;
  isFocus: boolean;
  sourceCount: number;
  relationCount: number;
}

export interface WikiGraphViewEdge {
  sourceId: string;
  targetId: string;
  type: string;
  label: string;
}

export interface WikiGraphQuickAction {
  kind: "open" | "refresh_stale" | "inspect_sources";
  label: string;
  nodeId?: string;
  path?: string;
}

export interface WikiGraphViewModel {
  nodes: WikiGraphViewNode[];
  edges: WikiGraphViewEdge[];
  summary: {
    nodes: number;
    edges: number;
    staleNodes: number;
    highConfidenceNodes: number;
    byType: Record<string, number>;
  };
  quickActions: WikiGraphQuickAction[];
}

export function buildWikiGraphViewModel(
  nodes: ContexWikiNode[],
  options: WikiGraphViewOptions = {}
): WikiGraphViewModel {
  const index = buildWikiGraphIndex(nodes);
  const maxNodes = options.maxNodes ?? 80;
  const focusNode = options.focusNodeId
    ? index.nodesById.get(options.focusNodeId)
    : null;
  const orderedNodes = [...nodes].sort((left, right) => {
    if (left.id === options.focusNodeId) {
      return -1;
    }

    if (right.id === options.focusNodeId) {
      return 1;
    }

    return right.updatedAt.localeCompare(left.updatedAt);
  });
  const visibleNodes = orderedNodes.slice(0, maxNodes);
  const visibleIds = new Set(visibleNodes.map((node) => node.id));
  const viewNodes = visibleNodes.map((node) => {
    const assessment = scoreWikiNodeConfidence(node, { now: options.now });

    return {
      id: node.id,
      title: node.title,
      type: node.type,
      path: node.path,
      confidence: assessment.score,
      confidenceLevel: assessment.level,
      needsRefresh: assessment.needsRefresh,
      isFocus: node.id === options.focusNodeId,
      sourceCount: node.sources.length,
      relationCount: node.relations.length
    };
  });
  const edges = index.edges
    .filter((edge) => visibleIds.has(edge.sourceId) && visibleIds.has(edge.targetId))
    .map((edge) => ({
      sourceId: edge.sourceId,
      targetId: edge.targetId,
      type: edge.type,
      label: edge.label ?? edge.type
    }));
  const summary = buildSummary(viewNodes, edges);

  return {
    nodes: viewNodes,
    edges,
    summary,
    quickActions: buildQuickActions(viewNodes, focusNode)
  };
}

function buildSummary(
  nodes: WikiGraphViewNode[],
  edges: WikiGraphViewEdge[]
): WikiGraphViewModel["summary"] {
  const byType: Record<string, number> = {};

  nodes.forEach((node) => {
    byType[node.type] = (byType[node.type] ?? 0) + 1;
  });

  return {
    nodes: nodes.length,
    edges: edges.length,
    staleNodes: nodes.filter((node) => node.needsRefresh).length,
    highConfidenceNodes: nodes.filter((node) => node.confidenceLevel === "high").length,
    byType
  };
}

function buildQuickActions(
  nodes: WikiGraphViewNode[],
  focusNode: ContexWikiNode | null | undefined
): WikiGraphQuickAction[] {
  const actions: WikiGraphQuickAction[] = [];
  const firstNode = focusNode
    ? nodes.find((node) => node.id === focusNode.id)
    : nodes[0];
  const staleNode = nodes.find((node) => node.needsRefresh);
  const sourceNode = nodes.find((node) => node.sourceCount > 0) ?? firstNode;

  if (firstNode) {
    actions.push({
      kind: "open",
      label: `Open ${firstNode.title}`,
      nodeId: firstNode.id,
      path: firstNode.path
    });
  }

  if (staleNode) {
    actions.push({
      kind: "refresh_stale",
      label: `Refresh ${staleNode.title}`,
      nodeId: staleNode.id,
      path: staleNode.path
    });
  }

  if (sourceNode) {
    actions.push({
      kind: "inspect_sources",
      label: `Inspect sources for ${sourceNode.title}`,
      nodeId: sourceNode.id,
      path: sourceNode.path
    });
  }

  return actions;
}
