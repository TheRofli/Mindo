import type { VaultSearchResult, WebSearchResult } from "../types";

export type RealSourceKind = "vault" | "web" | "raw" | "attachment" | "wiki";
export type RealSourceConfidence = "high" | "medium" | "low" | "unknown";

export interface RawSourceReferenceInput {
  path: string;
  title: string;
  capturedAt?: string;
  confidence?: RealSourceConfidence;
}

export interface SourceReferenceInput {
  vaultSources?: VaultSearchResult[] | null;
  webSources?: WebSearchResult[] | null;
  rawSources?: RawSourceReferenceInput[] | null;
}

export interface RealSourceReference {
  id: string;
  kind: RealSourceKind;
  title: string;
  clickTarget: string;
  citation: string;
  confidence: RealSourceConfidence;
  date?: string;
  snippet?: string;
}

export interface RealSourceRegistry {
  sources: RealSourceReference[];
}

export function appendSourceReferenceSection(
  content: string,
  input: SourceReferenceInput
): string {
  const vaultSources = input.vaultSources ?? [];
  const webSources = input.webSources ?? [];
  const rawSources = input.rawSources ?? [];

  if (!vaultSources.length && !webSources.length && !rawSources.length) {
    return content.trim();
  }

  const trimmed = content.trim();
  const sourceIndex = formatSourceRegistryMarkdown(
    buildRealSourceRegistry({ vaultSources, webSources, rawSources })
  );

  if (!sourceIndex) {
    return trimmed;
  }

  if (/^#{1,6}\s+(?:source index|source map)\b/imu.test(trimmed)) {
    return trimmed;
  }

  return `${trimmed}\n\n${sourceIndex}`.trim();
}

export function buildRealSourceRegistry(
  input: SourceReferenceInput
): RealSourceRegistry {
  const sourceMap = new Map<string, RealSourceReference>();

  (input.vaultSources ?? []).slice(0, 20).forEach((source) => {
    const title = source.title || source.path.replace(/\.md$/i, "");
    const reference = createSourceReference({
      kind: "vault",
      title,
      clickTarget: source.path,
      confidence: scoreToConfidence(source.score),
      snippet: source.snippet
    });
    sourceMap.set(reference.id, reference);
  });

  (input.webSources ?? []).slice(0, 20).forEach((source) => {
    const reference = createSourceReference({
      kind: "web",
      title: source.title,
      clickTarget: source.url,
      confidence: scoreToConfidence(source.score),
      date: source.publishedDate,
      snippet: source.snippet
    });
    sourceMap.set(reference.id, reference);
  });

  (input.rawSources ?? []).slice(0, 20).forEach((source) => {
    const reference = createSourceReference({
      kind: "raw",
      title: source.title,
      clickTarget: source.path,
      confidence: source.confidence ?? "medium",
      date: source.capturedAt?.slice(0, 10)
    });
    sourceMap.set(reference.id, reference);
  });

  return {
    sources: [...sourceMap.values()]
  };
}

export function formatSourceRegistryMarkdown(
  registry: RealSourceRegistry
): string {
  if (!registry.sources.length) {
    return "";
  }

  return [
    "## Sources",
    "",
    ...registry.sources.map((source) =>
      [
        `- ${formatInlineCitation(source)}`,
        `kind: ${source.kind}`,
        source.date ? `date: ${source.date}` : "",
        `confidence: ${source.confidence}`
      ]
        .filter(Boolean)
        .join(" | ")
    )
  ].join("\n");
}

export function formatInlineCitation(source: RealSourceReference): string {
  if (source.kind === "web") {
    return `[${escapeMarkdownLinkText(source.title)}](${source.clickTarget})`;
  }

  return `[[${escapeWikiLinkTarget(source.clickTarget)}|${escapeWikiLinkText(
    source.title
  )}]]`;
}

function createSourceReference(input: Omit<RealSourceReference, "id" | "citation">): RealSourceReference {
  const id = `${input.kind}:${input.clickTarget}`;

  return {
    id,
    ...input,
    citation: input.kind === "web" ? input.clickTarget : input.clickTarget
  };
}

function scoreToConfidence(score: number | undefined): RealSourceConfidence {
  if (score === undefined || !Number.isFinite(score)) {
    return "unknown";
  }

  if (score >= 100) {
    return "high";
  }

  if (score >= 40) {
    return "medium";
  }

  return "low";
}

function escapeMarkdownLinkText(value: string): string {
  return value.replace(/[[\]\\]/g, "\\$&");
}

function escapeWikiLinkTarget(value: string): string {
  return value.replace(/\.md$/i, "").replace(/\|/g, " ");
}

function escapeWikiLinkText(value: string): string {
  return value.replace(/\|/g, " ");
}
