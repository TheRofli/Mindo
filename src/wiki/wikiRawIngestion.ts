import { getContexWikiPaths, normalizeWikiRootFolder } from "./wikiBootstrap";
import type { ContexWikiSourceKind } from "./wikiSchema";

export type ContexRawIngestionKind = Exclude<
  ContexWikiSourceKind,
  "manual" | "raw"
>;

export interface RawIngestionInput {
  kind: ContexRawIngestionKind;
  title: string;
  locator: string;
  content: string;
  capturedAt: string;
  metadata?: Record<string, string | number | boolean | null>;
}

export interface RawIngestionRecord extends RawIngestionInput {
  id: string;
}

export function createRawIngestionRecord(
  input: RawIngestionInput
): RawIngestionRecord {
  const slug = createSlug(input.title) || input.kind;
  const hash = hashText(
    [input.kind, input.title, input.locator, input.content].join("\n")
  ).slice(0, 8);

  return {
    ...input,
    id: `raw-${input.kind}-${slug}-${hash}`
  };
}

export function getRawIngestionPath(
  rootFolder: string,
  record: RawIngestionRecord
): string {
  const paths = getContexWikiPaths(normalizeWikiRootFolder(rootFolder));
  const folderByKind: Record<ContexRawIngestionKind, string> = {
    web: paths.raw.web,
    vault: paths.raw.vault,
    attachment: paths.raw.attachments,
    chat: paths.raw.chat
  };

  return `${folderByKind[record.kind]}/${record.id}.md`;
}

export function buildRawIngestionMarkdown(record: RawIngestionRecord): string {
  const metadataLines = Object.entries(record.metadata ?? {}).map(
    ([key, value]) => `  ${key}: ${formatYamlScalar(value)}`
  );

  return [
    "---",
    "contex_raw: true",
    `raw_id: ${record.id}`,
    `raw_kind: ${record.kind}`,
    `title: ${quoteYaml(record.title)}`,
    `locator: ${quoteYaml(record.locator)}`,
    `captured: ${record.capturedAt}`,
    "metadata:",
    ...(metadataLines.length ? metadataLines : ["  {}"]),
    "---",
    "",
    record.content.trim(),
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
    .slice(0, 60);
}

function hashText(value: string): string {
  let hash = 2166136261;

  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }

  return (hash >>> 0).toString(36).padStart(8, "0");
}

function quoteYaml(value: string): string {
  return JSON.stringify(value);
}

function formatYamlScalar(value: string | number | boolean | null): string {
  if (typeof value === "string") {
    return quoteYaml(value);
  }

  if (value === null) {
    return "null";
  }

  return String(value);
}
