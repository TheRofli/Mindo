import {
  serializeWikiJsonl,
  type ContexWikiNode,
  type ContexWikiRelation,
  type ContexWikiSourceRef
} from "./wikiSchema";

export interface WikiGraphEdge extends ContexWikiRelation {
  sourceId: string;
}

export interface WikiGraphIndex {
  nodesById: Map<string, ContexWikiNode>;
  aliasesByKey: Map<string, string[]>;
  sourcesById: Map<string, ContexWikiSourceRef>;
  edges: WikiGraphEdge[];
}

export interface WikiSchemaFiles {
  nodesJsonl: string;
  edgesJsonl: string;
  aliasesJson: string;
  sourcesJsonl: string;
}

export function buildWikiGraphIndex(nodes: ContexWikiNode[]): WikiGraphIndex {
  const nodesById = new Map<string, ContexWikiNode>();
  const aliasesByKey = new Map<string, string[]>();
  const sourcesById = new Map<string, ContexWikiSourceRef>();
  const edges: WikiGraphEdge[] = [];

  nodes.forEach((node) => {
    nodesById.set(node.id, node);
    addAlias(aliasesByKey, node.title, node.id);
    node.aliases.forEach((alias) => addAlias(aliasesByKey, alias, node.id));
    node.sources.forEach((source) => sourcesById.set(source.id, source));
    node.relations.forEach((relation) => {
      edges.push({
        ...relation,
        sourceId: node.id
      });
    });
  });

  return { nodesById, aliasesByKey, sourcesById, edges };
}

export function findWikiNodeIdsByAlias(
  index: WikiGraphIndex,
  query: string
): string[] {
  return index.aliasesByKey.get(normalizeAliasKey(query)) ?? [];
}

export function getWikiNeighborhood(
  index: WikiGraphIndex,
  startNodeId: string,
  depth: number
): ContexWikiNode[] {
  const visited = new Set<string>();
  const queue: Array<{ id: string; depth: number }> = [
    { id: startNodeId, depth: 0 }
  ];
  const result: ContexWikiNode[] = [];

  while (queue.length) {
    const current = queue.shift();

    if (!current || visited.has(current.id)) {
      continue;
    }

    const node = index.nodesById.get(current.id);

    if (!node) {
      continue;
    }

    visited.add(current.id);
    result.push(node);

    if (current.depth >= depth) {
      continue;
    }

    index.edges.forEach((edge) => {
      if (edge.sourceId === current.id && !visited.has(edge.targetId)) {
        queue.push({ id: edge.targetId, depth: current.depth + 1 });
      }

      if (edge.targetId === current.id && !visited.has(edge.sourceId)) {
        queue.push({ id: edge.sourceId, depth: current.depth + 1 });
      }
    });
  }

  return result;
}

export function buildWikiSchemaFiles(nodes: ContexWikiNode[]): WikiSchemaFiles {
  const index = buildWikiGraphIndex(nodes);
  const aliases = Object.fromEntries(
    [...index.aliasesByKey.entries()].sort(([left], [right]) =>
      left.localeCompare(right)
    )
  );

  return {
    nodesJsonl: serializeWikiJsonl(nodes),
    edgesJsonl: serializeWikiJsonl(index.edges),
    aliasesJson: `${JSON.stringify(aliases, null, 2)}\n`,
    sourcesJsonl: serializeWikiJsonl([...index.sourcesById.values()])
  };
}

function addAlias(
  aliasesByKey: Map<string, string[]>,
  alias: string,
  nodeId: string
): void {
  const key = normalizeAliasKey(alias);

  if (!key) {
    return;
  }

  const values = aliasesByKey.get(key) ?? [];

  if (!values.includes(nodeId)) {
    values.push(nodeId);
  }

  aliasesByKey.set(key, values);
}

function normalizeAliasKey(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}
