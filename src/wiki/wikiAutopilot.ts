import type {
  ContexActionReceipt,
  ContexActionStatus,
  WikiUpdateAction
} from "../actions/actionTypes";
import type {
  ContexWikiNode,
  ContexWikiNodeType,
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
  signals: string[];
  misses: string[];
  targetNodeType: ContexWikiNodeType;
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

interface WikiMemorySignalAnalysis {
  score: number;
  signals: string[];
  misses: string[];
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
  const signalAnalysis = getMemorySignalScore({
    userText: input.userText,
    assistantText: input.assistantText,
    memoryReceipts,
    sourcePaths,
    webSources: input.webSources ?? []
  });
  const signalScore = signalAnalysis.score;
  const title = inferWikiTitle(input, sourcePaths);
  const inferredNodeType = inferWikiNodeType(input, title);
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
      signals: signalAnalysis.signals,
      misses: signalAnalysis.misses,
      targetNodeType: inferredNodeType,
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
      signals: signalAnalysis.signals,
      misses: signalAnalysis.misses,
      targetNodeType: match.node.type,
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
      signals: signalAnalysis.signals,
      misses: signalAnalysis.misses,
      targetNodeType: match.node.type,
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
    signals: signalAnalysis.signals,
    misses: signalAnalysis.misses,
    targetNodeType: inferredNodeType,
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
    const missLines = decision.misses.length
      ? decision.misses.map((miss) => `- ${miss}`)
      : ["- No durable memory update needed."];

    return [
      "Wiki autopilot: ignored.",
      "Not saved because:",
      ...missLines
    ].join("\n");
  }

  const target = decision.targetPath
    ? `${decision.title} (${decision.targetPath})`
    : decision.title;
  const sourceLines = decision.sources.length
    ? decision.sources.map((source) => `- ${source.title}: ${source.locator}`)
    : ["- No concrete sources captured."];
  const signalLines = decision.signals.length
    ? decision.signals.map((signal) => `- ${signal}`)
    : ["- No explicit signals captured."];

  return [
    "Wiki autopilot",
    `Action: ${decision.kind}`,
    `Target: ${target}`,
    `Confidence: ${Math.round(decision.confidence * 100)}%`,
    `Reason: ${decision.reason}`,
    "Signals:",
    ...signalLines,
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
}): WikiMemorySignalAnalysis {
  let score = 0;
  const signals: string[] = [];
  const misses: string[] = [];
  const combined = `${input.userText}\n${input.assistantText ?? ""}`.toLowerCase();
  const userLength = input.userText.trim().length;
  const assistantLength = (input.assistantText ?? "").trim().length;
  const combinedLength = userLength + assistantLength;
  const addSignal = (points: number, signal: string) => {
    score += points;
    signals.push(signal);
  };

  if (input.memoryReceipts.length) {
    const receiptSummary = input.memoryReceipts
      .slice(0, 3)
      .map((receipt) => `${receipt.kind}:${receipt.status}`)
      .join(", ");
    addSignal(2, `action receipt: ${receiptSummary}`);
  } else {
    misses.push("No saved/applied action receipts.");
  }

  if (input.webSources.length) {
    addSignal(2, `web source evidence: ${input.webSources.length} source(s)`);
  } else {
    misses.push("No web sources captured.");
  }

  if (input.sourcePaths.length) {
    addSignal(1, `vault source evidence: ${input.sourcePaths.length} path(s)`);
  } else {
    misses.push("No vault source paths captured.");
  }

  if (combinedLength > 900 && userLength > 80 && assistantLength > 300) {
    addSignal(2, "substantial user+assistant discussion");
  } else if (combinedLength > 450 && userLength > 60 && assistantLength > 180) {
    addSignal(1, "medium-length user+assistant discussion");
  } else {
    misses.push("Conversation was too short to be durable on length alone.");
  }

  if (
    /research|web|source|plan|roadmap|architecture|decision|compare|analysis|analyze|update|current|fresh|modern|workflow|milestone|task|spec|design|implementation|202[0-9]/i.test(
      combined
    )
  ) {
    addSignal(2, "durable planning/research keywords");
  }

  const problemComparable = combined.replace(/\bno problem\b/gi, "");
  if (
    /problem|bug|error|failed|broken|fix|issue|regression|stuck|interrupt|barge-in|vad|memory|wiki/i.test(
      problemComparable
    )
  ) {
    addSignal(2, "problem/debug/memory keywords");
  }

  if (
    /создай|создать|план|проект|роадмап|архитект|решени|сравн|анализ|актуал|свеж|современ|исслед|интернет|источник|ошибка|проблем|слом|не работает|почини|исправ|вики|памят|воркфлоу|workflow|milestone|майлстоун|задач|спек|дизайн|реализац/u.test(
      combined
    )
  ) {
    addSignal(2, "localized durable project keywords");
  }

  if (
    /исслед|интернет|источник|план|роадмап|архитект|решени|сравн|анализ|актуал|свеж|современ|создай|обнови|проверь/u.test(
      combined
    )
  ) {
    addSignal(2, "localized research/update keywords");
  }

  if ((input.assistantText?.length ?? 0) > 600) {
    addSignal(1, "long assistant answer");
  }

  if (!signals.some((signal) => signal.includes("keywords"))) {
    misses.push("No durable planning, research, problem, or Wiki keywords detected.");
  }

  return {
    score,
    signals: uniqueStrings(signals),
    misses: uniqueStrings(misses)
  };
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

  return cleanTitle(normalized || "Mindo Wiki Update");
}

function inferWikiNodeType(
  input: WikiAutopilotInput,
  title: string
): ContexWikiNodeType {
  const combined = normalizeComparableText(
    [
      title,
      input.userText,
      input.assistantText ?? "",
      ...(input.sourcePaths ?? [])
    ].join(" ")
  );

  if (
    hasTypeSignal(combined, [
      "error",
      "failed",
      "bug",
      "broken",
      "issue",
      "problem",
      "fix",
      "regression",
      "stuck",
      "barge in",
      "vad",
      "не работает",
      "ошибка",
      "проблема",
      "слом",
      "баг",
      "почини",
      "исправ"
    ])
  ) {
    return "problem";
  }

  if (
    hasTypeSignal(combined, [
      "decide",
      "decision",
      "chosen",
      "accepted",
      "rejected",
      "tradeoff",
      "принимаем",
      "решение",
      "выбор",
      "договорились",
      "отклон",
      "принять"
    ])
  ) {
    return "decision";
  }

  if (
    hasTypeSignal(combined, [
      "model",
      "llm",
      "stt",
      "tts",
      "whisper",
      "parakeet",
      "silero",
      "kokoro",
      "gemini",
      "deepseek",
      "qwen",
      "llama",
      "bitnet",
      "модель",
      "голос",
      "транскрип",
      "озвуч",
      "нейросет"
    ])
  ) {
    return "model";
  }

  if (
    hasTypeSignal(combined, [
      "project",
      "roadmap",
      "mvp",
      "release",
      "product",
      "architecture",
      "plan",
      "feature",
      "v1",
      "проект",
      "план",
      "роадмап",
      "фича",
      "продукт",
      "релиз",
      "архитектура"
    ])
  ) {
    return "project";
  }

  if (
    hasTypeSignal(combined, [
      "workflow",
      "flow",
      "pipeline",
      "process",
      "scenario",
      "режим",
      "процесс",
      "сценарий",
      "пайплайн",
      "флоу"
    ])
  ) {
    return "workflow";
  }

  if (
    hasTypeSignal(combined, [
      "tool",
      "plugin",
      "extension",
      "cli",
      "api",
      "runtime",
      "service",
      "инструмент",
      "плагин",
      "расширение",
      "кнопка",
      "сервис"
    ])
  ) {
    return "tool";
  }

  return "concept";
}

function hasTypeSignal(value: string, signals: string[]): boolean {
  return signals.some((signal) => value.includes(normalizeComparableText(signal)));
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
