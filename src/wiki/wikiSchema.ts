export type ContexWikiNodeType =
  | "project"
  | "concept"
  | "tool"
  | "model"
  | "workflow"
  | "decision"
  | "problem";

export type ContexWikiSourceKind =
  | "vault"
  | "web"
  | "attachment"
  | "chat"
  | "raw"
  | "manual";

export type ContexWikiRelationType =
  | "related_to"
  | "belongs_to"
  | "depends_on"
  | "uses"
  | "supersedes"
  | "blocks"
  | "mentions";

export type ContexWikiFreshness = "fresh" | "current" | "stale" | "unknown";

export interface ContexWikiSourceRef {
  id: string;
  kind: ContexWikiSourceKind;
  title: string;
  locator: string;
  capturedAt: string;
  excerpt?: string;
}

export interface ContexWikiRelation {
  type: ContexWikiRelationType;
  targetId: string;
  label?: string;
}

export interface ContexWikiNode {
  id: string;
  type: ContexWikiNodeType;
  title: string;
  aliases: string[];
  summary: string;
  path: string;
  confidence: number;
  freshness: ContexWikiFreshness;
  sources: ContexWikiSourceRef[];
  relations: ContexWikiRelation[];
  createdAt: string;
  updatedAt: string;
}

export interface WikiJsonlParseResult<T> {
  records: T[];
  errors: Array<{
    line: number;
    message: string;
  }>;
}

export function createWikiNodeId(
  type: ContexWikiNodeType,
  title: string
): string {
  const slug = createSlug(title) || "node";
  return `${type}-${slug}-${hashText(`${type}:${title}`).slice(0, 8)}`;
}

export function serializeWikiJsonl(records: unknown[]): string {
  return records
    .map((record) => `${JSON.stringify(sortObjectKeys(record))}\n`)
    .join("");
}

export function parseWikiJsonl<T>(content: string): WikiJsonlParseResult<T> {
  const records: T[] = [];
  const errors: WikiJsonlParseResult<T>["errors"] = [];
  const lines = content.split(/\r?\n/);

  lines.forEach((line, index) => {
    const trimmed = line.trim();

    if (!trimmed) {
      return;
    }

    try {
      records.push(JSON.parse(trimmed) as T);
    } catch (error) {
      errors.push({
        line: index + 1,
        message: error instanceof Error ? error.message : String(error)
      });
    }
  });

  return { records, errors };
}

export function buildWikiNodeFrontmatter(node: ContexWikiNode): string {
  return [
    "---",
    "contex_node: true",
    `node_id: ${node.id}`,
    `node_type: ${node.type}`,
    `title: ${quoteYaml(node.title)}`,
    "aliases:",
    ...node.aliases.map((alias) => `  - ${quoteYaml(alias)}`),
    `confidence: ${formatConfidence(node.confidence)}`,
    `freshness: ${node.freshness}`,
    `created: ${node.createdAt}`,
    `updated: ${node.updatedAt}`,
    "sources:",
    ...node.sources.map((source) => `  - ${quoteYaml(source.id)}`),
    "relations:",
    ...node.relations.map(
      (relation) =>
        `  - ${quoteYaml(`${relation.type}:${relation.targetId}`)}`
    ),
    "---",
    ""
  ].join("\n");
}

function createSlug(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-")
    .slice(0, 48);
}

function hashText(value: string): string {
  let hash = 2166136261;

  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }

  return (hash >>> 0).toString(36).padStart(8, "0");
}

function sortObjectKeys(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(sortObjectKeys);
  }

  if (typeof value !== "object" || value === null) {
    return value;
  }

  return Object.keys(value)
    .sort()
    .reduce<Record<string, unknown>>((result, key) => {
      result[key] = sortObjectKeys((value as Record<string, unknown>)[key]);
      return result;
    }, {});
}

function quoteYaml(value: string): string {
  return JSON.stringify(value);
}

function formatConfidence(value: number): string {
  const bounded = Number.isFinite(value) ? Math.min(1, Math.max(0, value)) : 0;
  return String(Math.round(bounded * 100) / 100);
}
