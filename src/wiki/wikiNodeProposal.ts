import {
  createWikiNodeId,
  type ContexWikiFreshness,
  type ContexWikiNode,
  type ContexWikiNodeType,
  type ContexWikiRelation,
  type ContexWikiRelationType,
  type ContexWikiSourceKind,
  type ContexWikiSourceRef
} from "./wikiSchema";

export type WikiNodeProposalAction = "create" | "update" | "merge";

export interface WikiNodeProposal {
  action: WikiNodeProposalAction;
  reason: string;
  node: ContexWikiNode;
}

export interface WikiNodeMergeResult {
  node: ContexWikiNode;
  changedFields: string[];
}

export function buildWikiNodeExtractionPrompt(input: {
  rawExcerpt: string;
  existingNodes: ContexWikiNode[];
}): string {
  const existing = input.existingNodes
    .map((node) => `- ${node.id} | ${node.type} | ${node.title}`)
    .join("\n");

  return [
    "You maintain Mindo Wiki, a structured durable memory for an Obsidian vault.",
    "Return strict JSON only: {\"proposals\":[{\"action\":\"create|update|merge\",\"reason\":\"...\",\"node\":{...}}]}",
    "Prefer updating existing nodes when the fact belongs there. Create only when the concept is distinct.",
    "Every node must include id, type, title, aliases, summary, path, confidence, freshness, sources, relations, createdAt, updatedAt.",
    "",
    "Existing nodes:",
    existing || "(none)",
    "",
    "Raw evidence excerpt:",
    input.rawExcerpt.trim()
  ].join("\n");
}

export function normalizeWikiNodeProposal(
  value: unknown,
  nowIso: string
): WikiNodeProposal | null {
  if (!isObject(value) || !isProposalAction(value.action)) {
    return null;
  }

  const rawNode = isObject(value.node) ? value.node : null;

  if (!rawNode || !isNodeType(rawNode.type) || typeof rawNode.title !== "string") {
    return null;
  }

  const title = rawNode.title.trim();

  if (!title) {
    return null;
  }

  const id =
    typeof rawNode.id === "string" && rawNode.id.trim()
      ? rawNode.id.trim()
      : createWikiNodeId(rawNode.type, title);

  return {
    action: value.action,
    reason:
      typeof value.reason === "string" && value.reason.trim()
        ? value.reason.trim()
        : "Wiki node proposal",
    node: {
      id,
      type: rawNode.type,
      title,
      aliases: uniqueStrings(rawNode.aliases),
      summary:
        typeof rawNode.summary === "string" ? rawNode.summary.trim() : "",
      path: typeof rawNode.path === "string" ? rawNode.path.trim() : "",
      confidence: clampConfidence(rawNode.confidence),
      freshness: isFreshness(rawNode.freshness)
        ? rawNode.freshness
        : "unknown",
      sources: normalizeSources(rawNode.sources),
      relations: normalizeRelations(rawNode.relations),
      createdAt:
        typeof rawNode.createdAt === "string" && rawNode.createdAt.trim()
          ? rawNode.createdAt.trim()
          : nowIso,
      updatedAt: nowIso
    }
  };
}

export function mergeWikiNodeUpdate(
  existing: ContexWikiNode,
  proposal: WikiNodeProposal
): WikiNodeMergeResult {
  const proposed = proposal.node;
  const node: ContexWikiNode = {
    ...existing,
    title: proposed.title || existing.title,
    aliases: uniqueStrings([...existing.aliases, ...proposed.aliases]),
    summary: proposed.summary || existing.summary,
    path: existing.path || proposed.path,
    confidence: Math.max(existing.confidence, proposed.confidence),
    freshness:
      proposed.freshness !== "unknown" ? proposed.freshness : existing.freshness,
    sources: mergeSources(existing.sources, proposed.sources),
    relations: mergeRelations(existing.relations, proposed.relations),
    updatedAt: proposed.updatedAt || existing.updatedAt
  };

  const changedFields = [
    hasChanged(existing.aliases, node.aliases) ? "aliases" : null,
    existing.summary !== node.summary ? "summary" : null,
    existing.confidence !== node.confidence ? "confidence" : null,
    existing.freshness !== node.freshness ? "freshness" : null,
    hasChanged(existing.sources, node.sources) ? "sources" : null,
    hasChanged(existing.relations, node.relations) ? "relations" : null
  ].filter((field): field is string => Boolean(field));

  return { node, changedFields };
}

function normalizeSources(value: unknown): ContexWikiSourceRef[] {
  if (!Array.isArray(value)) {
    return [];
  }

  const sources: ContexWikiSourceRef[] = [];

  value.forEach((item) => {
    if (
      !isObject(item) ||
      typeof item.id !== "string" ||
      !isSourceKind(item.kind) ||
      typeof item.title !== "string" ||
      typeof item.locator !== "string" ||
      typeof item.capturedAt !== "string"
    ) {
      return;
    }

    sources.push({
      id: item.id.trim(),
      kind: item.kind,
      title: item.title.trim(),
      locator: item.locator.trim(),
      capturedAt: item.capturedAt.trim(),
      excerpt: typeof item.excerpt === "string" ? item.excerpt : undefined
    });
  });

  return sources;
}

function normalizeRelations(value: unknown): ContexWikiRelation[] {
  if (!Array.isArray(value)) {
    return [];
  }

  const relations: ContexWikiRelation[] = [];

  value.forEach((item) => {
    if (
      !isObject(item) ||
      !isRelationType(item.type) ||
      typeof item.targetId !== "string"
    ) {
      return;
    }

    relations.push({
      type: item.type,
      targetId: item.targetId.trim(),
      label: typeof item.label === "string" ? item.label.trim() : undefined
    });
  });

  return relations;
}

function mergeSources(
  left: ContexWikiSourceRef[],
  right: ContexWikiSourceRef[]
): ContexWikiSourceRef[] {
  const byId = new Map<string, ContexWikiSourceRef>();

  [...left, ...right].forEach((source) => byId.set(source.id, source));
  return [...byId.values()];
}

function mergeRelations(
  left: ContexWikiRelation[],
  right: ContexWikiRelation[]
): ContexWikiRelation[] {
  const byKey = new Map<string, ContexWikiRelation>();

  [...left, ...right].forEach((relation) => {
    byKey.set(`${relation.type}:${relation.targetId}`, relation);
  });

  return [...byKey.values()];
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isProposalAction(value: unknown): value is WikiNodeProposalAction {
  return value === "create" || value === "update" || value === "merge";
}

function isNodeType(value: unknown): value is ContexWikiNodeType {
  return (
    value === "project" ||
    value === "concept" ||
    value === "tool" ||
    value === "model" ||
    value === "workflow" ||
    value === "decision" ||
    value === "problem"
  );
}

function isFreshness(value: unknown): value is ContexWikiFreshness {
  return (
    value === "fresh" ||
    value === "current" ||
    value === "stale" ||
    value === "unknown"
  );
}

function isSourceKind(value: unknown): value is ContexWikiSourceKind {
  return (
    value === "vault" ||
    value === "web" ||
    value === "attachment" ||
    value === "chat" ||
    value === "raw" ||
    value === "manual"
  );
}

function isRelationType(value: unknown): value is ContexWikiRelationType {
  return (
    value === "related_to" ||
    value === "belongs_to" ||
    value === "depends_on" ||
    value === "uses" ||
    value === "supersedes" ||
    value === "blocks" ||
    value === "mentions"
  );
}

function uniqueStrings(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  const seen = new Set<string>();
  const result: string[] = [];

  value.forEach((item) => {
    if (typeof item !== "string") {
      return;
    }

    const normalized = item.trim();
    const key = normalized.toLowerCase();

    if (!normalized || seen.has(key)) {
      return;
    }

    seen.add(key);
    result.push(normalized);
  });

  return result;
}

function clampConfidence(value: unknown): number {
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? Math.min(1, Math.max(0, parsed)) : 0;
}

function hasChanged(left: unknown, right: unknown): boolean {
  return JSON.stringify(left) !== JSON.stringify(right);
}
