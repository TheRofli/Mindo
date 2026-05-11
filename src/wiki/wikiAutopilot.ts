import type {
  ContexActionReceipt,
  ContexActionStatus,
  WikiUpdateAction
} from "../actions/actionTypes";
import type {
  ContexWikiNode,
  ContexWikiSourceKind,
  ContexWikiSourceRef
} from "./wikiSchema";

export type WikiAutopilotDecisionKind =
  | "ignore"
  | "propose_create"
  | "propose_update"
  | "merge_existing";

export interface WikiAutopilotWebSourceInput {
  title: string;
  url: string;
  date?: string;
  excerpt?: string;
}

export interface WikiAutopilotInput {
  userText: string;
  assistantText?: string;
  receipts?: ContexActionReceipt[];
  sourcePaths?: string[];
  webSources?: WikiAutopilotWebSourceInput[];
  existingNodes?: ContexWikiNode[];
  now?: string;
}

export interface WikiAutopilotDecision {
  kind: WikiAutopilotDecisionKind;
  shouldWriteWiki: boolean;
  title: string;
  reason: string;
  confidence: number;
  targetNodeId?: string;
  targetPath?: string;
  sourceActionIds: string[];
  sourcePaths: string[];
  sources: ContexWikiSourceRef[];
}

interface WikiAutopilotActionInput {
  sourceActionIds?: string[];
  userText: string;
}

const MEMORY_RECEIPT_STATUSES = new Set<ContexActionStatus>([
  "saved",
  "applied",
  "done"
]);

const MEMORY_RECEIPT_KINDS = new Set([
  "create_note",
  "research_note",
  "update_note",
  "replace_text",
  "replace_selection"
]);

export function decideWikiAutopilot(
  input: WikiAutopilotInput
): WikiAutopilotDecision {
  const now = input.now ?? new Date().toISOString();
  const receipts = input.receipts ?? [];
  const sourcePaths = uniqueStrings([
    ...(input.sourcePaths ?? []),
    ...receipts
      .map((receipt) => receipt.path)
      .filter((path): path is string => Boolean(path))
  ]);
  const memoryReceipts = receipts.filter(isMemoryReceipt);
  const signalScore = getMemorySignalScore({
    userText: input.userText,
    assistantText: input.assistantText,
    memoryReceipts,
    sourcePaths,
    webSources: input.webSources ?? []
  });
  const title = inferWikiTitle(input, sourcePaths);
  const sources = buildAutopilotSources({
    sourcePaths,
    webSources: input.webSources ?? [],
    now
  });
  const sourceActionIds = memoryReceipts.map((receipt) => receipt.actionId);

  if (signalScore < 2) {
    return {
      kind: "ignore",
      shouldWriteWiki: false,
      title,
      reason: "No durable memory signal was strong enough for Wiki update.",
      confidence: 0.2,
      sourceActionIds,
      sourcePaths,
      sources
    };
  }

  const match = findBestExistingNode(title, input.userText, input.existingNodes ?? []);
  const confidence = Math.min(0.98, 0.45 + signalScore * 0.1 + sources.length * 0.06);

  if (match && match.score >= 0.82) {
    return {
      kind: "merge_existing",
      shouldWriteWiki: true,
      title: match.node.title,
      reason: "New evidence belongs to an existing Wiki node; merge instead of creating a duplicate.",
      confidence,
      targetNodeId: match.node.id,
      targetPath: match.node.path,
      sourceActionIds,
      sourcePaths,
      sources
    };
  }

  if (match && match.score >= 0.55) {
    return {
      kind: "propose_update",
      shouldWriteWiki: true,
      title: match.node.title,
      reason: "New evidence appears related to an existing Wiki node and should be reviewed as an update.",
      confidence,
      targetNodeId: match.node.id,
      targetPath: match.node.path,
      sourceActionIds,
      sourcePaths,
      sources
    };
  }

  return {
    kind: "propose_create",
    shouldWriteWiki: true,
    title,
    reason: "The result contains durable project knowledge and should be proposed for Wiki memory.",
    confidence,
    sourceActionIds,
    sourcePaths,
    sources
  };
}

export function buildWikiAutopilotAction(
  decision: WikiAutopilotDecision,
  input: WikiAutopilotActionInput
): WikiUpdateAction | null {
  if (!decision.shouldWriteWiki) {
    return null;
  }

  return {
    id: createId("wiki-auto"),
    kind: "update_wiki",
    reason: decision.kind,
    sourceActionIds: uniqueStrings([
      ...(input.sourceActionIds ?? []),
      ...decision.sourceActionIds
    ]),
    sourcePaths: decision.sourcePaths,
    proposalPrompt: [
      input.userText.trim(),
      "",
      `Wiki autopilot: ${decision.kind}`,
      `Target: ${decision.title}`,
      decision.targetPath ? `Target path: ${decision.targetPath}` : "",
      `Reason: ${decision.reason}`
    ]
      .filter(Boolean)
      .join("\n"),
    automatic: true
  };
}

export function formatWikiAutopilotDecision(
  decision: WikiAutopilotDecision
): string {
  if (!decision.shouldWriteWiki) {
    return "Wiki autopilot: ignored. No durable memory update needed.";
  }

  const target = decision.targetPath
    ? `${decision.title} (${decision.targetPath})`
    : decision.title;
  const sourceLines = decision.sources.length
    ? decision.sources.map((source) => `- ${source.title}: ${source.locator}`)
    : ["- No concrete sources captured."];

  return [
    "Wiki autopilot",
    `Action: ${decision.kind}`,
    `Target: ${target}`,
    `Confidence: ${Math.round(decision.confidence * 100)}%`,
    `Reason: ${decision.reason}`,
    "Sources:",
    ...sourceLines
  ].join("\n");
}

function isMemoryReceipt(receipt: ContexActionReceipt): boolean {
  return (
    MEMORY_RECEIPT_STATUSES.has(receipt.status) &&
    MEMORY_RECEIPT_KINDS.has(receipt.kind)
  );
}

function getMemorySignalScore(input: {
  userText: string;
  assistantText?: string;
  memoryReceipts: ContexActionReceipt[];
  sourcePaths: string[];
  webSources: WikiAutopilotWebSourceInput[];
}): number {
  let score = 0;
  const combined = `${input.userText}\n${input.assistantText ?? ""}`.toLowerCase();

  if (input.memoryReceipts.length) {
    score += 2;
  }

  if (input.webSources.length) {
    score += 2;
  }

  if (input.sourcePaths.length) {
    score += 1;
  }

  if (
    /research|web|source|plan|roadmap|architecture|decision|compare|analysis|analyze|update|current|fresh|modern|202[0-9]/i.test(
      combined
    )
  ) {
    score += 2;
  }

  if (
    /исслед|интернет|источник|план|роадмап|архитект|решени|сравн|анализ|актуал|свеж|современ|создай|обнови|проверь/u.test(
      combined
    )
  ) {
    score += 2;
  }

  if ((input.assistantText?.length ?? 0) > 600) {
    score += 1;
  }

  return score;
}

function inferWikiTitle(input: WikiAutopilotInput, sourcePaths: string[]): string {
  const firstPathTitle = sourcePaths
    .map(pathToTitle)
    .find((title) => title && !/^untitled$/i.test(title));

  if (firstPathTitle) {
    return firstPathTitle;
  }

  const quoted = input.userText.match(/["“«](.+?)["”»]/u)?.[1]?.trim();

  if (quoted) {
    return cleanTitle(quoted);
  }

  const normalized = input.userText
    .replace(/^.*?(?:about|про|о|для)\s+/iu, "")
    .replace(/\b(using|with|from|в|из|с)\b.*$/iu, "")
    .trim();

  return cleanTitle(normalized || "Contex Wiki Update");
}

function buildAutopilotSources(input: {
  sourcePaths: string[];
  webSources: WikiAutopilotWebSourceInput[];
  now: string;
}): ContexWikiSourceRef[] {
  const sources: ContexWikiSourceRef[] = [];

  input.sourcePaths.forEach((path, index) => {
    sources.push(createSourceRef("vault", pathToTitle(path), path, input.now, index));
  });

  input.webSources.forEach((source, index) => {
    sources.push({
      ...createSourceRef("web", source.title, source.url, input.now, index),
      capturedAt: source.date || input.now,
      excerpt: source.excerpt
    });
  });

  return sources;
}

function createSourceRef(
  kind: ContexWikiSourceKind,
  title: string,
  locator: string,
  now: string,
  index: number
): ContexWikiSourceRef {
  return {
    id: `${kind}-${hashText(`${kind}:${locator}:${index}`).slice(0, 10)}`,
    kind,
    title: title || locator,
    locator,
    capturedAt: now
  };
}

function findBestExistingNode(
  title: string,
  userText: string,
  nodes: ContexWikiNode[]
): { node: ContexWikiNode; score: number } | null {
  let best: { node: ContexWikiNode; score: number } | null = null;
  const normalizedTitle = normalizeComparableText(title);
  const normalizedUserText = normalizeComparableText(userText);
  const queryTokens = tokenize(`${title} ${userText}`);

  nodes.forEach((node) => {
    const names = [node.title, ...node.aliases].map(normalizeComparableText);
    const hasExactName = names.some(
      (name) =>
        name === normalizedTitle ||
        (name.length >= 4 && normalizedUserText.includes(name))
    );
    const nodeText = [node.title, ...node.aliases, node.summary].join(" ");
    const score = hasExactName
      ? 1
      : tokenSimilarity(queryTokens, tokenize(nodeText));

    if (!best || score > best.score) {
      best = { node, score };
    }
  });

  return best;
}

function tokenSimilarity(left: Set<string>, right: Set<string>): number {
  if (!left.size || !right.size) {
    return 0;
  }

  let overlap = 0;
  left.forEach((token) => {
    if (right.has(token)) {
      overlap += 1;
    }
  });

  return overlap / Math.min(left.size, right.size);
}

function tokenize(value: string): Set<string> {
  return new Set(
    value
      .toLowerCase()
      .normalize("NFKD")
      .replace(/[\u0300-\u036f]/g, "")
      .split(/[^\p{L}\p{N}]+/u)
      .map((token) => token.trim())
      .filter((token) => token.length >= 3)
  );
}

function pathToTitle(path: string): string {
  const fileName = path.split(/[\\/]/).pop() ?? path;
  return cleanTitle(fileName.replace(/\.md$/i, ""));
}

function cleanTitle(value: string): string {
  return value
    .replace(/[`*_#[\]]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 120);
}

function normalizeComparableText(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function uniqueStrings(values: string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];

  values.forEach((value) => {
    const normalized = value.trim();
    const key = normalized.toLowerCase();

    if (!normalized || seen.has(key)) {
      return;
    }

    seen.add(key);
    result.push(normalized);
  });

  return result;
}

function createId(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random()
    .toString(36)
    .slice(2, 8)}`;
}

function hashText(value: string): string {
  let hash = 2166136261;

  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }

  return (hash >>> 0).toString(36).padStart(8, "0");
}
